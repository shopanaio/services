# План оптимизации storefront listing query через 5 параллельных SQL-запросов

## Цель

Сделать storefront listing response быстрым и предсказуемым без cache, новых
данных в PostgreSQL и материализации.

Каждый listing request должен возвращать полный response:

- ordered page rows для cursor pagination;
- `hasNextPage`;
- `totalCount`;
- facets metadata без counts;
- facet counts;
- price range;
- in-stock count.

Это намеренное изменение runtime/API контракта storefront listing read path.
Текущие optional aggregate flags (`includeTotalCount`, `includeFacets`,
`includePriceRange`, `includeInStockCount`) больше не должны определять состав
repository response для этого endpoint. Storefront PLP получает единый полный
response всегда; экономия latency достигается параллельным выполнением
обязательных branches и complexity validation, а не пропуском aggregates.

Целевой runtime contract:

```text
DB round-trip count: <= 5
Query execution: parallel independent read statements
Repository SLR: <= 100ms для каждого допустимого request
Partial response: запрещен
```

## Runtime/API breaking contract

Этот план меняет поведение storefront listing read path: optimized repository
path всегда вычисляет полный listing response и больше не использует
`includeTotalCount`, `includeFacets`, `includePriceRange` и
`includeInStockCount` как runtime переключатели для SQL branches.

Это public API breaking change. Storefront GraphQL/API schema и документация
должны быть обновлены так, что PLP listing всегда возвращает `totalCount`,
facets, `priceRange` и `inStockCount`. Optional aggregate flags удаляются из
публичного контракта.

Acceptance:

- storefront schema/API docs отражают always-full response;
- optional aggregate flags удалены из публичного API и repository input;
- SQL implementation не зависит от optional aggregate flags.

## Жесткие ограничения

Запрещено:

- вводить application cache, Redis cache, request cache или DataLoader cache для
  listing aggregates;
- добавлять новые данные в PostgreSQL;
- добавлять новые таблицы, индексы, materialized views, precomputed rows или
  materialized projections;
- переносить вычисления в offline sync/rebuild;
- менять семантику product-level, variant-level и same-variant filters.

Разрешено:

- переписать runtime SQL;
- объединять текущий последовательный fan-out в независимые read statements;
- запускать независимые read statements параллельно через существующий
  `DatabaseClient`/Drizzle execution path;
- использовать CTE, `VALUES`, `LATERAL`, JSON input, roaring bitmap operators,
  `EXPLAIN` и complexity validation;
- повторно строить base bitmap в разных параллельных queries, если это дает
  более простые и быстрые планы.

## Почему не один mega-query

Один большой SQL statement минимизирует round-trip, но не всегда минимизирует
latency. Для listing он может быть хуже, потому что:

- page collector, facet counts и virtual facets имеют разные оптимальные планы;
- один большой CTE graph сложнее для PostgreSQL planner;
- facet counts могут доминировать CPU и memory, мешая page collector;
- optional branches больше не optional: все aggregates обязательны, значит
  mega-query всегда тянет тяжелые ветки;
- один mega-query хуже наблюдать и профилировать: сложнее понять, какой branch
  является bottleneck.

Более практичная цель:

```text
5 специализированных query, запущенных параллельно.
Wall-clock ~= max(A, B, C, D, E) + network/driver overhead.
```

Для Neon или другого быстрого managed PostgreSQL round-trip может быть дешевым,
но CPU, memory и допустимая параллельность PostgreSQL всё равно конечны. Поэтому
план фиксирует верхний предел:

```text
max parallel listing branches per request: 5
```

## Важное ограничение SLR

`<= 100ms` нельзя честно гарантировать для неограниченной сложности без cache,
новых данных или материализации. Поэтому SLR применяется только к допустимым
requests после complexity validation.

```text
Допустимый request: выполняется <= 100ms.
Недопустимый request: отклоняется до SQL.
```

Complexity guard не является cache или материализацией. Это часть публичного
runtime контракта.

## Текущее состояние

`StorefrontListingQueryRepository.getStorefrontListing()` сейчас выполняет
много последовательных SQL round-trip:

1. resolve facet filters;
2. load category/collection/vendor/product facet/option facet posting bitmaps;
3. collect page;
4. count total;
5. load available facet values;
6. count product facet values;
7. count option facet values;
8. price range;
9. in-stock count.

Для полной listing страницы это легко превращается в 15-25+ round-trip.
Основная проблема: fan-out между Node.js и PostgreSQL плюс повторная сборка
bitmap expressions в TypeScript.

Текущий API также позволяет вызывающей стороне отключать отдельные aggregates
через `includeTotalCount`, `includeFacets`, `includePriceRange` и
`includeInStockCount`. В рамках этого плана такая вариативность считается
устаревшей для storefront PLP: optimized path проектируется под always-full
response и не должен иметь отдельные fast paths для неполного ответа.

## Целевое состояние

### Запросы

Разделить read path на независимые SQL statements:

```text
Query A: page rows + hasNextPage
Query B: totalCount
Query C: facets metadata без counts
Query D: all facet counts
Query E: priceRange + inStockCount
```

Все queries получают один и тот же normalized input. Каждый query сам строит
нужные scope/filter bitmaps внутри своего statement. Это повторяет часть
CPU-работы, но дает более простые планы и позволяет выполнять ветки
параллельно. Facet metadata отделены от counts: metadata query остается легким и
стабильным, а тяжелая bitmap aggregation изолирована в Query D.

Facet counts в начальном дизайне считаются одним батчем:

```text
Query D = product facet counts UNION ALL option facet counts
```

Дробление counts на большее число запросов не входит в initial implementation.
Если profiling покажет, что Query D стабильно ломает SLR, это должно быть
отдельным решением с новым лимитом fan-out.

### Repository orchestration

```ts
async getStorefrontListing(
  input: StorefrontListingInput
): Promise<StorefrontListingRepositoryResult> {
  const request = normalizeAndValidateListingInput(input);

  const result = await runBoundedParallel(
    [
      () => this.pageQuery.getPage(request),
      () => this.totalCountQuery.getTotalCount(request),
      () => this.facetsQuery.getFacets(request),
      () => this.facetCountsQuery.getCounts(request),
      () => this.virtualFacetsQuery.getVirtualFacets(request),
    ],
    { concurrency: 5 }
  );

  const facets = mergeFacetCounts({
    facets: result.facets.facets,
    countsByValueKey: result.facetCounts.countsByValueKey,
  });

  return {
    rows: result.page.rows,
    hasNextPage: result.page.hasNextPage,
    totalCount: result.totalCount.value,
    facets,
    priceRange: result.virtualFacets.priceRange,
    inStockCount: result.virtualFacets.inStockCount,
  };
}
```

Важно: параллельные reads не должны выполняться внутри одного transaction-bound
execution context.

### Consistency model

Default:

```text
READ COMMITTED
parallel read queries
independent read statements
```

Listing index обновляется асинхронно, поэтому response допускает eventual
consistency между page, counts и virtual facets в пределах одного request.

Если позже потребуется strict snapshot consistency, нужно отдельно проектировать
shared snapshot flow. Такой режим почти наверняка будет медленнее и не должен
быть default для storefront PLP.

## Shared SQL fragments

Каждый branch должен компилировать одинаковые базовые фрагменты:

```text
input
requested_facets
resolved_facets
vendor_filter_group
scope_products
scope_variant_filters
published_products
product_filter_groups
product_filters
option_filter_groups
in_stock_variants
active_stock_product_filter
active_stock_variant_filter
price_variant_filter
variant_filters
projected_variant_products
matches
```

Эти фрагменты не должны исполняться отдельными repository calls. Они встраиваются
в каждый statement как CTE.

Для читаемости в примерах используются helper-имена вроде `rb_build_empty()` и
`rb_and_agg(...)`. Production compiler должен подставлять реальные выражения из
текущего `sqlHelpers.ts`, например empty bitmap через `emptyRoaringBitmapSql()`,
а AND между группами собирать оператором, доступным в PostgreSQL roaring
extension.

Shared fragments обязаны сохранять текущую storefront filter semantics:

- `vendor_filter_group` является product-level filter и должен входить в
  `product_filters` вместе с product facet groups.
- `price_variant_filter` строится из active price predicate по
  `listing_posting_variant_price` и входит в `variant_filters`.
- `active_stock_variant_filter` строится из active `in_stock` predicate, если
  он задан, а при option/price variant path без explicit stock predicate должен
  использовать текущий default `in_stock = true`.
- `active_stock_product_filter` используется только для stock-only path, когда
  нет option facet groups и active price predicate. Это сохраняет текущий
  быстрый product-level stock filter.
- `scope_variant_filters` покрывает rule collection variant predicates. Если
  rule collection состоит только из variant-level rules, этот bitmap также
  используется collector-ом для matched variant price semantics.
- Search scope должен пересекать published/scope product bitmap с BM25 candidate
  bitmap до `matches`; relevance collector использует тот же normalized query.

## Query A: page rows + hasNextPage

Назначение:

- resolve public facet filters;
- построить `matches`;
- выбрать collector branch;
- вернуть page rows;
- вернуть `hasNextPage`.

Форма SQL:

```sql
WITH
input AS (
  SELECT
    $1::uuid AS project_id,
    $2::text AS locale,
    $3::text AS currency,
    $4::text AS scope_kind,
    $5::uuid AS scope_id,
    $6::text AS sort_kind,
    $7::int AS first,
    $8::jsonb AS facet_filters_json,
    $9::jsonb AS vendor_ids_json,
    $10::jsonb AS price_filter_json,
    $11::jsonb AS stock_filter_json,
    $12::jsonb AS cursor_json
),
requested_facets AS (
  SELECT r.facet_slug, r.value_handle
  FROM input i
  CROSS JOIN LATERAL jsonb_to_recordset(i.facet_filters_json)
    AS r(facet_slug text, value_handle text)
),
resolved_facets AS (
  SELECT DISTINCT
    f.id::text AS facet_id,
    f.facet_type,
    COALESCE(parent_fv.id, fv.id)::text AS facet_value_id,
    f.id::text || ':' || COALESCE(parent_fv.id, fv.id)::text AS value_key
  FROM requested_facets r
  JOIN input i ON true
  JOIN listing.catalog_facet_runtime f
    ON f.project_id = i.project_id
   AND f.slug = r.facet_slug
  JOIN listing.catalog_facet_value_runtime fv
    ON fv.project_id = f.project_id
   AND fv.facet_id = f.id
   AND fv.handle = r.value_handle
  LEFT JOIN listing.catalog_facet_value_runtime parent_fv
    ON parent_fv.project_id = fv.project_id
   AND parent_fv.id = fv.parent_id
),
scope_products AS (
  SELECT COALESCE((
    SELECT p.bitmap
    FROM listing.listing_posting_bitmap p
    JOIN input i ON true
    WHERE p.project_id = i.project_id
      AND p.entity_type = 'product'
      AND p.field = CASE
        WHEN i.scope_kind = 'category' THEN 'category'
        WHEN i.scope_kind = 'manual_collection' THEN 'collection'
        ELSE '__unsupported__'
      END
      AND p.value_key = i.scope_id::text
  ), (
    SELECT COALESCE(rb_build_agg(pli.product_doc_id), rb_build_empty())
    FROM listing.product_listing_index pli
    JOIN input i ON true
    WHERE pli.project_id = i.project_id
      AND pli.status = 'published'
      AND i.scope_kind IN ('global', 'search')
  ), rb_build_empty()) AS bitmap
),
published_products AS (
  SELECT COALESCE(rb_build_agg(pli.product_doc_id), rb_build_empty()) AS bitmap
  FROM listing.product_listing_index pli
  JOIN input i ON true
  WHERE pli.project_id = i.project_id
    AND pli.status = 'published'
),
product_filter_groups AS (
  SELECT
    rf.facet_id,
    COALESCE(rb_or_agg(p.bitmap), rb_build_empty()) AS bitmap
  FROM resolved_facets rf
  JOIN input i ON true
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND p.value_key = rf.value_key
  WHERE rf.facet_type IN ('TAG', 'FEATURE')
  GROUP BY rf.facet_id
),
vendor_filter_group AS (
  SELECT
    '__vendor__'::text AS facet_id,
    COALESCE(rb_or_agg(p.bitmap), rb_build_empty()) AS bitmap
  FROM input i
  CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json) v(vendor_id)
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'product'
   AND p.field = 'vendor'
   AND p.value_key = v.vendor_id
),
active_stock_product_filter AS (
  SELECT
    CASE
      WHEN i.stock_filter_json ? 'value'
       AND NOT EXISTS (
         SELECT 1
         FROM resolved_facets rf
         WHERE rf.facet_type = 'OPTION'
       )
       AND i.price_filter_json = '{}'::jsonb
      THEN COALESCE((
        SELECT rb_build_agg(pli.product_doc_id)
        FROM listing.product_listing_index pli
        WHERE pli.project_id = i.project_id
          AND pli.status = 'published'
          AND pli.in_stock = (i.stock_filter_json->>'value')::boolean
      ), rb_build_empty())
      ELSE NULL
    END AS bitmap
  FROM input i
),
product_filters AS (
  SELECT rb_and_agg(bitmap) AS bitmap
  FROM (
    SELECT bitmap FROM product_filter_groups
    UNION ALL
    SELECT bitmap FROM vendor_filter_group
    WHERE EXISTS (
      SELECT 1
      FROM input i
      CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json) v(vendor_id)
    )
    UNION ALL
    SELECT bitmap FROM active_stock_product_filter WHERE bitmap IS NOT NULL
  ) x
),
option_filter_groups AS (
  SELECT
    rf.facet_id,
    COALESCE(rb_or_agg(p.bitmap), rb_build_empty()) AS bitmap
  FROM resolved_facets rf
  JOIN input i ON true
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'variant'
   AND p.field = 'facet'
   AND p.value_key = rf.value_key
  WHERE rf.facet_type = 'OPTION'
  GROUP BY rf.facet_id
),
in_stock_variants AS (
  SELECT COALESCE(rb_build_agg(vli.variant_doc_id), rb_build_empty()) AS bitmap
  FROM listing.variant_listing_index vli
  JOIN input i ON true
  WHERE vli.project_id = i.project_id
    AND vli.in_stock = true
),
active_stock_variant_filter AS (
  SELECT
    CASE
      WHEN i.stock_filter_json ? 'value'
      THEN COALESCE((
        SELECT rb_build_agg(vli.variant_doc_id)
        FROM listing.variant_listing_index vli
        WHERE vli.project_id = i.project_id
          AND vli.in_stock = (i.stock_filter_json->>'value')::boolean
      ), rb_build_empty())
      WHEN EXISTS (SELECT 1 FROM option_filter_groups)
        OR i.price_filter_json <> '{}'::jsonb
      THEN (SELECT bitmap FROM in_stock_variants)
      ELSE NULL
    END AS bitmap
  FROM input i
),
price_variant_filter AS (
  SELECT
    CASE
      WHEN i.price_filter_json <> '{}'::jsonb
      THEN COALESCE((
        SELECT rb_build_agg(vp.variant_doc_id)
        FROM listing.listing_posting_variant_price vp
        WHERE vp.project_id = i.project_id
          AND vp.currency = i.currency
          AND (
            NOT (i.price_filter_json ? 'minPriceMinor')
            OR vp.price_minor >= (i.price_filter_json->>'minPriceMinor')::bigint
          )
          AND (
            NOT (i.price_filter_json ? 'maxPriceMinor')
            OR vp.price_minor <= (i.price_filter_json->>'maxPriceMinor')::bigint
          )
      ), rb_build_empty())
      ELSE NULL
    END AS bitmap
  FROM input i
),
variant_filters AS (
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM option_filter_groups)
        OR (SELECT bitmap FROM price_variant_filter) IS NOT NULL
        OR (SELECT bitmap FROM active_stock_variant_filter) IS NOT NULL
      THEN (
        SELECT rb_and_agg(bitmap)
        FROM (
          SELECT bitmap FROM option_filter_groups
          UNION ALL
          SELECT bitmap FROM price_variant_filter WHERE bitmap IS NOT NULL
          UNION ALL
          SELECT bitmap FROM active_stock_variant_filter WHERE bitmap IS NOT NULL
        ) x
      )
      ELSE NULL
    END AS bitmap
),
projected_variant_products AS (
  SELECT
    CASE
      WHEN (SELECT bitmap FROM variant_filters) IS NULL
      THEN NULL
      ELSE COALESCE(rb_or_agg(projected.product_bitmap), rb_build_empty())
    END AS bitmap
  FROM (
    SELECT
      CASE
        WHEN rb_cardinality(vf.bitmap & b.variant_bitmap) = b.variant_count
        THEN b.product_bitmap
        ELSE COALESCE((
          SELECT rb_build_agg(vli.product_doc_id)
          FROM listing.variant_listing_index vli
          WHERE vli.project_id = i.project_id
            AND vli.variant_doc_id >= b.variant_doc_from
            AND vli.variant_doc_id < b.variant_doc_to
            AND (vf.bitmap & b.variant_bitmap) @> vli.variant_doc_id
        ), rb_build_empty())
      END AS product_bitmap
    FROM input i
    CROSS JOIN variant_filters vf
    JOIN listing.listing_posting_variant_projection_block b
      ON b.project_id = i.project_id
     AND vf.bitmap IS NOT NULL
     AND rb_cardinality(vf.bitmap & b.variant_bitmap) > 0
  ) projected
),
matches AS (
  SELECT
    CASE
      WHEN pf.bitmap IS NOT NULL AND pvp.bitmap IS NOT NULL
      THEN sp.bitmap & pp.bitmap & pf.bitmap & pvp.bitmap
      WHEN pf.bitmap IS NOT NULL
      THEN sp.bitmap & pp.bitmap & pf.bitmap
      WHEN pvp.bitmap IS NOT NULL
      THEN sp.bitmap & pp.bitmap & pvp.bitmap
      ELSE sp.bitmap & pp.bitmap
    END AS bitmap
  FROM scope_products sp
  CROSS JOIN published_products pp
  CROSS JOIN product_filters pf
  CROSS JOIN projected_variant_products pvp
),
page_scan AS (
  SELECT
    s.product_doc_id,
    s.product_id,
    COALESCE(s.bool_value, false) AS in_stock,
    s.timestamptz_value,
    s.timestamptz_value_2,
    s.bigint_value,
    s.text_value
  FROM listing.listing_posting_product_sort s
  JOIN input i ON true
  CROSS JOIN matches m
  WHERE s.project_id = i.project_id
    AND s.sort_kind = i.sort_kind
    AND s.locale = CASE WHEN i.sort_kind = 'name' THEN i.locale ELSE '' END
    AND s.currency = CASE
      WHEN i.sort_kind IN ('price_asc', 'price_desc') THEN i.currency
      ELSE ''
    END
    AND m.bitmap @> s.product_doc_id
  ORDER BY
    COALESCE(s.bool_value, false) DESC,
    s.timestamptz_value DESC NULLS LAST,
    s.timestamptz_value_2 DESC NULLS LAST,
    s.product_id ASC
  LIMIT (SELECT first + 1 FROM input)
)
SELECT jsonb_build_object(
  'rows',
    COALESCE((
      SELECT jsonb_agg(to_jsonb(row_data))
      FROM (
        SELECT *
        FROM page_scan
        LIMIT (SELECT first FROM input)
      ) row_data
    ), '[]'::jsonb),
  'hasNextPage',
    (SELECT count(*) > (SELECT first FROM input) FROM page_scan)
) AS result;
```

Notes:

- Для `manual`, `created`, `name`, `price_asc`, `price_desc` compiler должен
  генерировать конкретный `ORDER BY`, а не универсальный CASE.
- Для matched variant price sort compiler должен заменить `page_scan` на branch
  по `listing_posting_variant_price`.
- Для relevance sort compiler должен заменить `page_scan` на BM25 branch.
- Query A/B/D должны использовать один и тот же compiler для `vendor`, `price`,
  stock-only, search scope и rule collection variant scope. Пример выше
  показывает форму CTE, но production compiler обязан подставить также
  `scope_variant_filters` и BM25 scope branch для соответствующих scopes.

## Query B: totalCount

Назначение:

- построить тот же `matches`;
- вернуть `rb_cardinality(matches)`.

Форма SQL:

```sql
WITH
-- input/resolved_facets/scope/filter/matches CTE такие же, как в Query A
total_count AS (
  SELECT rb_cardinality((SELECT bitmap FROM matches))::int AS value
)
SELECT jsonb_build_object(
  'totalCount', (SELECT value FROM total_count)
) AS result;
```

## Query C: facets metadata без counts

Назначение:

- найти candidate facet values;
- вернуть список facets и values без counts;
- сохранить порядок facets/values;
- вернуть `valueKey`, чтобы Query D можно было смерджить без дополнительной
  логики резолва.

Этот branch должен быть легким: он читает metadata и candidate values, но не
делает bitmap intersections для counts.

Форма SQL:

```sql
WITH
-- input/scope_products/published_products CTE такие же, как в Query A
-- scope_product_base должен учитывать published для category/manual scopes
scope_product_base AS (
  SELECT sp.bitmap & pp.bitmap AS bitmap
  FROM scope_products sp
  CROSS JOIN published_products pp
),
scope_variants AS (
  SELECT COALESCE(rb_build_agg(vli.variant_doc_id), rb_build_empty()) AS bitmap
  FROM listing.variant_listing_index vli
  JOIN input i ON true
  CROSS JOIN scope_product_base sp
  WHERE vli.project_id = i.project_id
    AND vli.in_stock = true
    AND sp.bitmap @> vli.product_doc_id
),
candidate_values AS (
  SELECT DISTINCT
    p.value_key
  FROM input i
  CROSS JOIN scope_product_base sp
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND rb_cardinality(sp.bitmap & p.bitmap) > 0

  UNION

  SELECT DISTINCT
    p.value_key
  FROM input i
  CROSS JOIN scope_variants sv
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'variant'
   AND p.field = 'facet'
   AND rb_cardinality(sv.bitmap & p.bitmap) > 0
),
facet_values AS (
  SELECT DISTINCT
    f.id::text AS facet_id,
    f.slug AS facet_slug,
    f.facet_type,
    f.lexo_rank AS facet_rank,
    fv.id::text AS facet_value_id,
    fv.handle AS value_handle,
    fv.lexo_rank AS value_rank,
    f.id::text || ':' || fv.id::text AS value_key
  FROM input i
  JOIN candidate_values cv ON true
  JOIN listing.catalog_facet_runtime f
    ON f.project_id = i.project_id
  JOIN listing.catalog_facet_value_runtime fv
    ON fv.project_id = f.project_id
   AND fv.facet_id = f.id
   AND cv.value_key = f.id::text || ':' || fv.id::text
),
grouped_facets AS (
  SELECT
    fv.facet_id,
    fv.facet_slug,
    fv.facet_type,
    fv.facet_rank,
    jsonb_agg(
      jsonb_build_object(
        'facetValueId', fv.facet_value_id,
        'valueHandle', fv.value_handle,
        'valueKey', fv.value_key
      )
      ORDER BY fv.value_rank, fv.facet_value_id
    ) AS values
  FROM facet_values fv
  GROUP BY fv.facet_id, fv.facet_slug, fv.facet_type, fv.facet_rank
)
SELECT jsonb_build_object(
  'facets',
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'facetId', gf.facet_id,
        'facetSlug', gf.facet_slug,
        'facetType', gf.facet_type,
        'values', gf.values
      )
      ORDER BY gf.facet_rank, gf.facet_id
    ), '[]'::jsonb)
) AS result
FROM grouped_facets gf;
```

Notes:

- Query C не считает counts.
- Query C может использовать только scope, потому facets metadata описывают
  доступные фильтры для listing scope.
- Query C должен строить candidate values двумя typed путями: product postings
  через `entity_type = 'product'` и option postings через
  `entity_type = 'variant'`. Нельзя проверять option values через product doc id
  bitmap.
- Для category/manual scopes `scope_product_base` должен пересекать scope bitmap
  с `published_products`, как текущий `productPostingScopeBitmapSql(...)`.
- Query C не должен парсить `p.value_key` через `split_part(...)::uuid`.
  `valueKey` должен строиться compiler/helper-ом из typed metadata
  (`facet_id`, `facet_value_id`) и использоваться как opaque join key.
- Если нужно скрывать values с нулевым count после активных filters, это должен
  делать merge step после Query D, а не metadata query.

## Query D: all facet counts

Назначение:

- resolve public facet filters;
- построить тот же base `matches`/filter groups;
- найти candidate facet values или получить те же `valueKey` через shared SQL;
- посчитать product facet counts;
- посчитать option facet counts с same-variant semantics;
- вернуть counts map по `valueKey`.

Facet counts являются самой тяжелой частью. Их нужно держать отдельно от page
collector, total count и facets metadata, чтобы PostgreSQL строил план именно
под aggregation.

Форма SQL:

```sql
WITH
-- input/resolved_facets/scope/published/product_filter_groups/
-- vendor_filter_group/active_stock_product_filter/price_variant_filter/
-- option_filter_groups/in_stock_variants/active_stock_variant_filter/variant_filters/
-- projected_variant_products/matches CTE такие же, как в Query A
scope_product_base AS (
  SELECT sp.bitmap & pp.bitmap AS bitmap
  FROM scope_products sp
  CROSS JOIN published_products pp
),
scope_variants AS (
  SELECT COALESCE(rb_build_agg(vli.variant_doc_id), rb_build_empty()) AS bitmap
  FROM listing.variant_listing_index vli
  JOIN input i ON true
  CROSS JOIN scope_product_base sp
  WHERE vli.project_id = i.project_id
    AND vli.in_stock = true
    AND sp.bitmap @> vli.product_doc_id
),
candidate_values AS (
  SELECT DISTINCT
    p.value_key
  FROM input i
  CROSS JOIN scope_product_base sp
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND rb_cardinality(sp.bitmap & p.bitmap) > 0

  UNION

  SELECT DISTINCT
    p.value_key
  FROM input i
  CROSS JOIN scope_variants sv
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'variant'
   AND p.field = 'facet'
   AND rb_cardinality(sv.bitmap & p.bitmap) > 0
),
facet_values AS (
  SELECT DISTINCT
    f.id::text AS facet_id,
    f.facet_type,
    fv.id::text AS facet_value_id,
    f.id::text || ':' || fv.id::text AS value_key
  FROM input i
  JOIN candidate_values cv ON true
  JOIN listing.catalog_facet_runtime f
    ON f.project_id = i.project_id
  JOIN listing.catalog_facet_value_runtime fv
    ON fv.project_id = f.project_id
   AND fv.facet_id = f.id
   AND cv.value_key = f.id::text || ':' || fv.id::text
  ORDER BY f.id::text, fv.id::text
  LIMIT $counted_facet_value_limit::int
),
product_facet_value_bitmaps AS (
  SELECT
    fv.facet_id,
    fv.facet_type,
    fv.value_key,
    p.bitmap AS value_bitmap
  FROM facet_values fv
  JOIN input i ON true
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND p.value_key = fv.value_key
  WHERE fv.facet_type IN ('TAG', 'FEATURE')
),
product_facet_counts AS (
  SELECT
    pvb.facet_id,
    pvb.facet_type,
    pvb.value_key,
    rb_cardinality(
      (
        SELECT
          CASE
            WHEN isolated_product_filters.bitmap IS NOT NULL
                 AND projected_variant_products.bitmap IS NOT NULL
            THEN scope_products.bitmap
              & published_products.bitmap
              & isolated_product_filters.bitmap
              & projected_variant_products.bitmap
            WHEN isolated_product_filters.bitmap IS NOT NULL
            THEN scope_products.bitmap
              & published_products.bitmap
              & isolated_product_filters.bitmap
            WHEN projected_variant_products.bitmap IS NOT NULL
            THEN scope_products.bitmap
              & published_products.bitmap
              & projected_variant_products.bitmap
            ELSE scope_products.bitmap & published_products.bitmap
          END
        FROM scope_products
        CROSS JOIN published_products
        CROSS JOIN projected_variant_products
        CROSS JOIN LATERAL (
          SELECT rb_and_agg(pfg.bitmap) AS bitmap
          FROM product_filter_groups pfg
          WHERE pfg.facet_id <> pvb.facet_id
        ) isolated_product_filters
      )
      & pvb.value_bitmap
    )::int AS count
  FROM product_facet_value_bitmaps pvb
),
option_facet_value_bitmaps AS (
  SELECT
    fv.facet_id,
    fv.facet_type,
    fv.value_key,
    p.bitmap AS value_bitmap
  FROM facet_values fv
  JOIN input i ON true
  JOIN listing.listing_posting_bitmap p
    ON p.project_id = i.project_id
   AND p.entity_type = 'variant'
   AND p.field = 'facet'
   AND p.value_key = fv.value_key
  WHERE fv.facet_type = 'OPTION'
  LIMIT $counted_option_facet_value_limit::int
),
option_facet_counts AS (
  SELECT
    ovb.facet_id,
    ovb.facet_type,
    ovb.value_key,
    rb_cardinality(
      (
        SELECT COALESCE(rb_or_agg(projected.product_bitmap), rb_build_empty())
        FROM (
          SELECT
            CASE
              WHEN rb_cardinality(option_variant_bitmap.bitmap & b.variant_bitmap)
                   = b.variant_count
              THEN b.product_bitmap
              ELSE COALESCE((
                SELECT rb_build_agg(vli.product_doc_id)
                FROM listing.variant_listing_index vli
                JOIN input i ON true
                WHERE vli.project_id = i.project_id
                  AND vli.variant_doc_id >= b.variant_doc_from
                  AND vli.variant_doc_id < b.variant_doc_to
                  AND (option_variant_bitmap.bitmap & b.variant_bitmap)
                      @> vli.variant_doc_id
              ), rb_build_empty())
            END AS product_bitmap
          FROM (
            SELECT
              CASE
                WHEN isolated_option_filters.bitmap IS NOT NULL
                THEN in_stock_variants.bitmap
                  & isolated_option_filters.bitmap
                  & ovb.value_bitmap
                ELSE in_stock_variants.bitmap & ovb.value_bitmap
              END AS bitmap
            FROM in_stock_variants
            CROSS JOIN LATERAL (
              SELECT rb_and_agg(ofg.bitmap) AS bitmap
              FROM option_filter_groups ofg
              WHERE ofg.facet_id <> ovb.facet_id
            ) isolated_option_filters
          ) option_variant_bitmap
          JOIN input i ON true
          JOIN listing.listing_posting_variant_projection_block b
            ON b.project_id = i.project_id
           AND rb_cardinality(option_variant_bitmap.bitmap & b.variant_bitmap) > 0
        ) projected
      )
      & (
        SELECT
          CASE
            WHEN product_filters.bitmap IS NOT NULL
            THEN scope_products.bitmap & published_products.bitmap & product_filters.bitmap
            ELSE scope_products.bitmap & published_products.bitmap
          END
        FROM scope_products
        CROSS JOIN published_products
        CROSS JOIN product_filters
      )
    )::int AS count
  FROM option_facet_value_bitmaps ovb
)
SELECT jsonb_build_object(
  'countsByValueKey',
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'valueKey', c.value_key,
        'count', c.count
      )
    ), '[]'::jsonb)
) AS result
FROM (
  SELECT * FROM product_facet_counts
  UNION ALL
  SELECT * FROM option_facet_counts
) c;
```

Notes:

- `facet_values` должен быть ограничен complexity budget.
- Query D должен использовать те же product/variant candidate rules, что Query C.
  Product candidate values проверяются через `scope_product_base`, option
  candidate values должны быть ограничены variant scope branch-ом compiler-а, а
  не product bitmap intersection.
- `facet_values` не должен парсить `p.value_key` через
  `split_part(...)::uuid`. Query D должен получать тот же opaque `valueKey`,
  который Query C строит из typed metadata.
- Product counts исключают active product group того же `facet_id`.
- Option counts исключают active option group того же `facet_id`, но сохраняют
  same-variant semantics до projection.
- Query D возвращает только counts, не metadata.
- Если facet counts branch завершился ошибкой, весь listing request падает:
  partial response запрещен.

## Query E: priceRange и inStockCount

Назначение:

- построить тот же base filters;
- посчитать price range;
- посчитать in-stock count;
- вернуть virtual facets.

Форма SQL:

Важно: Query E не должен переиспользовать `variant_filters` из Query A
буквально. Для virtual facets нужны изолированные variant bitmaps:

- `variant_filters_without_price` для `priceRange`;
- `variant_filters_without_stock` для `inStockCount`.

`variant_filters_without_price` должен включать active option facet groups и
active stock predicate, но не должен включать active price predicate. Иначе
`priceRange` станет диапазоном внутри уже выбранного price bucket вместо
диапазона доступных цен для текущих product/option/stock filters.

`variant_filters_without_stock` должен включать active option facet groups и
active price predicate, но не должен включать active stock predicate. Иначе
active option/price predicates могут потеряться при расчете `inStockCount`.

```sql
WITH
-- input/resolved_facets/scope/published/product_filters/
-- option_filter_groups/in_stock_variants CTE как в Query A
-- product_filters здесь не включает active in-stock predicate
-- price_variant_filter строится из active price predicate, NULL если его нет
-- active_stock_variant_filter строится из active in-stock predicate, NULL если его нет
product_base AS (
  SELECT
    CASE
      WHEN product_filters.bitmap IS NOT NULL
      THEN scope_products.bitmap & published_products.bitmap & product_filters.bitmap
      ELSE scope_products.bitmap & published_products.bitmap
    END AS bitmap
  FROM scope_products
  CROSS JOIN published_products
  CROSS JOIN product_filters
),
option_variant_filters AS (
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM option_filter_groups)
      THEN (SELECT rb_and_agg(bitmap) FROM option_filter_groups)
      ELSE NULL
    END AS bitmap
),
variant_filters_without_price AS (
  SELECT
    CASE
      WHEN ovf.bitmap IS NOT NULL AND asf.bitmap IS NOT NULL
      THEN ovf.bitmap & asf.bitmap
      WHEN ovf.bitmap IS NOT NULL
      THEN ovf.bitmap
      WHEN asf.bitmap IS NOT NULL
      THEN asf.bitmap
      ELSE NULL
    END AS bitmap
  FROM option_variant_filters ovf
  CROSS JOIN active_stock_variant_filter asf
),
variant_filters_without_stock AS (
  SELECT
    CASE
      WHEN ovf.bitmap IS NOT NULL AND pvf.bitmap IS NOT NULL
      THEN ovf.bitmap & pvf.bitmap
      WHEN ovf.bitmap IS NOT NULL
      THEN ovf.bitmap
      WHEN pvf.bitmap IS NOT NULL
      THEN pvf.bitmap
      ELSE NULL
    END AS bitmap
  FROM option_variant_filters ovf
  CROSS JOIN price_variant_filter pvf
),
price_range AS (
  SELECT jsonb_build_object(
    'minPriceMinor', MIN(vp.price_minor),
    'maxPriceMinor', MAX(vp.price_minor),
    'currency', (SELECT currency FROM input)
  ) AS value
  FROM listing.listing_posting_variant_price vp
  JOIN listing.variant_listing_index vli
    ON vli.project_id = vp.project_id
   AND vli.variant_doc_id = vp.variant_doc_id
   AND vli.product_doc_id = vp.product_doc_id
   AND vli.product_id = vp.product_id
   AND vli.in_stock = true
  JOIN input i ON true
  CROSS JOIN product_base pb
  WHERE vp.project_id = i.project_id
    AND vp.currency = i.currency
    AND pb.bitmap @> vp.product_doc_id
    AND (
      (SELECT bitmap FROM variant_filters_without_price) IS NULL
      OR (SELECT bitmap FROM variant_filters_without_price) @> vp.variant_doc_id
    )
),
in_stock_variant_matches AS (
  SELECT
    CASE
      WHEN (SELECT bitmap FROM variant_filters_without_stock) IS NULL
      THEN in_stock_variants.bitmap
      ELSE in_stock_variants.bitmap
        & (SELECT bitmap FROM variant_filters_without_stock)
    END AS bitmap
  FROM in_stock_variants
),
in_stock_products AS (
  SELECT COALESCE(rb_or_agg(projected.product_bitmap), rb_build_empty()) AS bitmap
  FROM (
    SELECT
      CASE
        WHEN rb_cardinality(isvm.bitmap & b.variant_bitmap)
             = b.variant_count
        THEN b.product_bitmap
        ELSE COALESCE((
          SELECT rb_build_agg(vli.product_doc_id)
          FROM listing.variant_listing_index vli
          JOIN input i ON true
          WHERE vli.project_id = i.project_id
            AND vli.variant_doc_id >= b.variant_doc_from
            AND vli.variant_doc_id < b.variant_doc_to
            AND (isvm.bitmap & b.variant_bitmap) @> vli.variant_doc_id
        ), rb_build_empty())
      END AS product_bitmap
    FROM in_stock_variant_matches isvm
    JOIN input i ON true
    JOIN listing.listing_posting_variant_projection_block b
      ON b.project_id = i.project_id
     AND rb_cardinality(isvm.bitmap & b.variant_bitmap) > 0
  ) projected
),
in_stock_count AS (
  SELECT rb_cardinality(isp.bitmap & pb.bitmap)::int AS value
  FROM in_stock_products isp
  CROSS JOIN product_base pb
)
SELECT jsonb_build_object(
  'priceRange', (SELECT value FROM price_range),
  'inStockCount', (SELECT value FROM in_stock_count)
) AS result;
```

Notes:

- `product_base` не должен включать active in-stock predicate. Stock predicate
  обрабатывается только через `active_stock_variant_filter` для `priceRange` и
  полностью исключается из `inStockCount`.
- `priceRange` исключает active price predicate, но сохраняет product, option и
  active stock filters. Если active stock filter равен `false`, price range
  возвращается как `null`, потому price index читает только in-stock variants.
- `inStockCount` исключает active in-stock predicate, но сохраняет product,
  option и active price filters. Option/price predicates пересекаются с
  `in_stock_variants` до projection, чтобы сохранить same-variant semantics.
- Query E отделен от facet counts, потому virtual facets обычно дешевле и не
  должны ждать тяжелую facet bucket aggregation внутри одного плана.

## Parallel execution requirements

### Independent statements

Параллелизм работает только если branches запускаются как независимые read
statements, а не как последовательные statements внутри одного transaction-bound
execution context.

Нельзя:

```text
BEGIN;
await queryA(tx);
await queryB(tx);
await queryC(tx);
await queryD(tx);
await queryE(tx);
COMMIT;
```

Это будет последовательное исполнение внутри transaction-bound execution
context.

Нужно:

```ts
const result = await runBoundedParallel(
  [
    () => pageQuery(database, request),
    () => totalCountQuery(database, request),
    () => facetsQuery(database, request),
    () => facetCountsQuery(database, request),
    () => virtualFacetsQuery(database, request),
  ],
  { concurrency: 5 }
);
```

## Complexity budget для 100ms

Добавить pre-SQL validation. Запросы за пределами бюджета отклоняются до БД.

Начальные лимиты:

| Параметр | Лимит |
| --- | ---: |
| `first` | 60 |
| facet filter groups | 8 |
| values per facet group | 24 |
| total requested facet values | 96 |
| vendor ids | 48 |
| rule collection predicates | 24 |
| search query length after normalize | 128 |
| counted facet values per request | 120 |
| counted option facet values per request | 60 |

Лимиты должны быть config-driven, но default должен быть строгим. Если продукту
нужно поднять лимит, сначала требуется `EXPLAIN ANALYZE` на representative data.

## Порядок внедрения

### Фаза 0. Public contract update

До SQL rewrite зафиксировать public API breaking change.

Acceptance:

- storefront GraphQL/API schema и документация описывают always-full response;
- optional aggregate flags удалены из публичного API и repository input;
- SQL implementation не зависит от optional aggregate flags.

### Фаза 1. Instrumentation

Добавить debug stats вокруг текущего implementation:

- количество SQL round-trip на request;
- duration каждого SQL statement;
- total duration;
- filter complexity;
- selected collector;
- aggregate complexity: counted facet values, option values, rule predicates.

Результат фазы: baseline p50/p95/p99 и список самых дорогих branches.

### Фаза 2. Shared SQL compiler fragments

Добавить internal module:

```text
services/listing/src/repositories/storefront/sql/
  compileListingInputSql.ts
  compileFacetResolutionSql.ts
  compileScopeSql.ts
  compileFiltersSql.ts
  compileVariantProjectionSql.ts
  compileMatchesSql.ts
  compilePageQuerySql.ts
  compileFacetsQuerySql.ts
  compileFacetCountsQuerySql.ts
  compileVirtualFacetsQuerySql.ts
  resultMappers.ts
```

Acceptance:

- shared fragments компилируются одинаково для всех branches;
- facet resolution больше не является отдельным DB round-trip;
- missing facet value дает тот же domain error.

### Фаза 3. Query A

Реализовать `page rows + hasNextPage`.

Acceptance:

- Query A делает 1 SQL round-trip;
- покрыты product sort collectors;
- cursor/hash validation сохраняется.

### Фаза 4. Query B

Реализовать `totalCount`.

Acceptance:

- Query B делает 1 SQL round-trip;
- `totalCount` считается через `rb_cardinality(matches)`;
- результат совпадает с текущим count semantics.

### Фаза 5. Query C

Реализовать facets metadata без counts.

Acceptance:

- Query C делает 1 SQL round-trip;
- возвращает facets и values с `valueKey`;
- не считает counts;
- порядок facets/values стабилен;
- `valueKey` строится из typed metadata через shared helper/compiler, без
  `split_part(...)::uuid` в SQL.

### Фаза 6. Query D

Реализовать all facet counts.

Acceptance:

- Query D делает 1 SQL round-trip;
- product facet isolation корректна;
- option facet same-variant semantics корректна;
- возвращает counts map по `valueKey`;
- counted values ограничены complexity budget;
- counts используют тот же opaque `valueKey`, что Query C, без ad hoc SQL
  parsing.

### Фаза 7. Query E

Реализовать price range и in-stock count.

Acceptance:

- Query E делает 1 SQL round-trip;
- active price predicate исключается из price range;
- price range сохраняет active option facet filters;
- active in-stock predicate исключается из in-stock count;
- `variant_filters_without_price` и `variant_filters_without_stock`
  компилируются отдельно;
- `product_base` не включает active in-stock predicate;
- остальные filters сохраняются.

### Фаза 8. Search, rule collections и collector parity

Расширить shared fragments:

- BM25 search scope;
- relevance collector;
- rule collection product predicates;
- rule collection variant predicates;
- matched variant price collector.

Новый optimized path нельзя включать для всех storefront requests, пока он не
покрывает все уже поддержанные scope/collector combinations.

Acceptance:

- search listing с relevance и всеми aggregates работает в модели максимум
  5 parallel branches;
- rule collection listing работает в модели максимум 5 parallel branches;
- price filter + matched variant price sort работает в модели максимум
  5 parallel branches;
- unsupported combinations должны быть реализованы до включения optimized path;
- repository fixtures покрывают supported scopes и collectors до global enable.

### Фаза 9. Parallel orchestration

Запустить все branches параллельно как независимые read statements.

Acceptance:

- full listing response делает максимум 5 DB round-trip;
- wall-clock примерно равен самому медленному branch;
- partial response невозможен;
- facets metadata и counts мержатся по `valueKey`;
- orchestration включается только после parity для search, rule collections,
  relevance и matched variant price collector.

### Фаза 10. Hard SLR gate

Включить:

- complexity budget;
- metrics for complexity rejection;
- removal of sequential fan-out path after supported scope/collector parity.

Acceptance:

- любой допустимый request укладывается в `<= 100ms` на agreed dataset;
- недопустимый request отклоняется до SQL;
- нет alternate response path, который возвращает медленный или partial response.

## Проверка корректности

Нужны fixtures на уровне repository для сравнения old vs new result:

- category + vendor + newest;
- manual collection + product facet + manual sort;
- global + several product facets + created;
- category + option filters + newest;
- product filters + aggregate price sort;
- price filter + matched variant price sort;
- name sort + product and option filters;
- rule collection + product filters + price desc;
- search + relevance;
- full aggregates with product and option facet isolation.

Для каждого сценария сравнивать:

- ordered `product_id`;
- cursors;
- `hasNextPage`;
- `totalCount`;
- facet counts;
- price range;
- in-stock count.

## Performance acceptance

Для каждого representative scenario собрать:

- `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` отдельно для каждого branch type;
- branch duration;
- total repository wall-clock;
- planning time;
- execution time;
- rows read per major CTE;
- bitmap cardinalities;
- temp files usage;
- driver wait time.

Acceptance:

```text
SQL round-trip count: <= 5
Queries execute as parallel independent read statements
Repository duration p95: <= 100ms
Query A page p95: <= 45ms
Query B totalCount p95: <= 35ms
Query C facets metadata p95: <= 35ms
Query D facet counts p95: <= 80ms
Query E virtual facets p95: <= 50ms
No partial response
No temp file spill
No materialized view/table/cache usage
```

## Риски

- Parallel branches повторно строят base bitmap. Это дополнительная CPU-работа,
  но она может быть дешевле, чем один сложный план с тяжелыми branches.
- Параллельные queries увеличивают нагрузку на PostgreSQL. Это нужно учитывать
  в representative performance profiling.
- READ COMMITTED допускает небольшую рассинхронизацию между page и counts при
  параллельном listing sync. Для storefront это принимается как default.
- Facet counts остаются главным риском для 100ms. Complexity budget обязателен.
- Без новых индексов, cache и материализации нельзя исправить все data-shape
  проблемы только SQL rewrite.

## Итоговая целевая метрика

```text
Full listing response: <= 5 PostgreSQL queries
Execution model: 5 parallel independent read branches
Required response fields: rows, hasNextPage, totalCount, facets, priceRange, inStockCount
SLR: <= 100ms for every request accepted by complexity budget
Cache/materialization/new PostgreSQL data: none
```
