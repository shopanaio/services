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
обязательных branches, а не пропуском aggregates.

Целевой runtime contract:

```text
DB round-trip count: <= 5
Query execution: parallel independent read statements
Repository p95 target: <= 100ms на agreed representative dataset
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
- SQL implementation не зависит от optional aggregate flags;
- если requested facet value не резолвится в storefront display value,
  listing request падает с тем же domain error, что текущий resolver. Missing
  value не может стать no-op filter ни в одном parallel branch.

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
  `EXPLAIN`;
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
    { concurrency: 5 },
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
search_candidate_products
rule_collection_scope
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
`rb_and_agg(...)`, а именованные placeholders вроде
`$...` обозначают bound parameters compiler-а.
Это не literal PostgreSQL syntax. Production compiler должен подставлять реальные
выражения из текущего `sqlHelpers.ts`, например empty bitmap через
`emptyRoaringBitmapSql()`, а AND между группами собирать оператором, доступным в
PostgreSQL roaring extension.

Shared fragments обязаны сохранять текущую storefront filter semantics:

- `vendor_filter_group` является product-level filter и должен входить в
  `product_filters` вместе с product facet groups.
- `price_variant_filter` строится из active price predicate по
  `listing_posting_variant_price`, должен быть ограничен active in-stock
  variants и входит в `variant_filters`.
- `active_stock_variant_filter` строится из active `in_stock` predicate, если
  он задан и его value равен `true`. При option/price variant path без explicit
  stock predicate он должен использовать текущий default `in_stock = true`.
  Explicit `in_stock = false` не может строить out-of-stock variant bitmap для
  option/price path: out-of-stock variants не участвуют в option filters, price
  filters, matched variant price sort, option counts и variant-level collection
  rules. Stock-only `false` обслуживается через `active_stock_product_filter`.
- `active_stock_product_filter` используется только для stock-only path, когда
  нет option facet groups, active price predicate и rule-level variant scope. Это
  сохраняет текущий быстрый product-level stock filter, но не ломает same-variant
  semantics rule collection.
- `scope_variant_filters` покрывает rule collection variant predicates. Если
  rule collection состоит только из variant-level rules, этот bitmap также
  используется collector-ом для matched variant price semantics.
- Search scope должен пересекать published/scope product bitmap с BM25 candidate
  bitmap до `matches`; relevance collector использует тот же normalized query.
- Query A/B/C/D/E должны использовать один и тот же compiled listing scope:
  category/manual/global/search/rule collection scope, published visibility,
  BM25 candidate bitmap и rule collection variant predicates не могут
  расходиться между branches.
- Для search scope candidate relation должна быть полной для normalized query.
  Нельзя использовать top-K BM25 relation как scope для aggregates, иначе
  `totalCount`, facets, `priceRange` и `inStockCount` описывают cap, а не полный
  search result.
- Для rule collection, состоящей только из variant-level rules, product scope
  строится через projection этих variant predicates, а collector/virtual facets
  сохраняют тот же variant scope до projection.
- Facet resolution и facet metadata должны работать только с enabled root display
  storefront values from real catalog schema (`facet_value.kind = 'display',
  parent_id IS NULL, enabled = true, reference_status = 'VALID'`). Enabled source
  children могут резолвиться в root display value через `parent_id`, но наружу и
  в `valueKey` возвращается root value id.
- Listing runtime Drizzle projection for `catalog.facet_value` must include the
  columns used by storefront SQL (`sort_index`, `enabled`, `reference_status`) or
  raw SQL compiler must reference them directly. Do not treat the current narrow
  runtime model as the full DB schema.
- Missing public facet value не должен silently drop-аться. Shared SQL fragment
  обязан либо вернуть все requested pairs, либо явно сигнализировать repository
  mapper-у domain error того же вида, что текущий resolver.
- Valid resolved value без posting row не должен silently drop-аться. Required
  filter group строится от normalized request groups, а не от найденных posting
  rows: если в OR-группе не найден ни один bitmap, эта группа становится empty
  bitmap и весь `matches` short-circuit-ится в empty result. Это относится к
  product facets, option facets и vendor ids.
- Facet resolution guard является branch-wide invariant. Допустимые реализации:
  pre-SQL resolution/validation до запуска Query A/B/C/D/E либо identical guard в
  каждом SQL branch. Запрещено поведение, при котором Query A возвращает
  `facetResolutionError`, а Query B/D/E молча считают aggregates без missing
  filter.

## Query A: page rows + hasNextPage

Назначение:

- resolve public facet filters;
- построить `matches`;
- выбрать collector branch;
- вернуть page rows;
- вернуть `hasNextPage`.

Форма SQL ниже показывает shared CTE и product-sort branch для `newest`.
Production compiler не должен использовать этот `page_scan` как общий branch
для всех sort kinds: каждый supported collector генерирует свой `ORDER BY`,
cursor payload и keyset predicate.

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
    COALESCE($8::jsonb, '[]'::jsonb) AS facet_filters_json,
    COALESCE($9::jsonb, '[]'::jsonb) AS vendor_ids_json,
    COALESCE($10::jsonb, '{}'::jsonb) AS price_filter_json,
    COALESCE($11::jsonb, '{}'::jsonb) AS stock_filter_json,
    COALESCE($12::jsonb, '{}'::jsonb) AS cursor_json,
    NULLIF($13::text, '') AS normalized_search_query
),
cursor_values AS (
  SELECT
    i.cursor_json IS NOT NULL AND i.cursor_json <> '{}'::jsonb AS has_cursor,
    COALESCE((i.cursor_json->>'inStock')::boolean, false) AS cursor_in_stock,
    (i.cursor_json->>'publishedAt')::timestamptz AS cursor_published_at,
    (i.cursor_json->>'productCreatedAt')::timestamptz AS cursor_product_created_at,
    (i.cursor_json->>'productId')::uuid AS cursor_product_id
  FROM input i
),
requested_facets AS (
  SELECT DISTINCT r.facet_slug, r.value_handle
  FROM input i
  CROSS JOIN LATERAL jsonb_to_recordset(i.facet_filters_json)
    AS r(facet_slug text, value_handle text)
),
resolved_facets AS (
  SELECT DISTINCT
    r.facet_slug AS requested_facet_slug,
    r.value_handle AS requested_value_handle,
    f.id::text AS facet_id,
    f.facet_type,
    COALESCE(parent_fv.id, fv.id)::text AS facet_value_id,
    f.id::text || ':' || COALESCE(parent_fv.id, fv.id)::text AS value_key
  FROM requested_facets r
  JOIN input i ON true
  JOIN catalog.facet f
    ON f.project_id = i.project_id
   AND f.slug = r.facet_slug
  JOIN catalog.facet_value fv
    ON fv.project_id = f.project_id
   AND fv.facet_id = f.id
   AND fv.handle = r.value_handle
  LEFT JOIN catalog.facet_value parent_fv
    ON parent_fv.project_id = fv.project_id
   AND parent_fv.id = fv.parent_id
   AND parent_fv.kind = 'display'
   AND parent_fv.parent_id IS NULL
   AND parent_fv.enabled = true
   AND parent_fv.reference_status = 'VALID'
  WHERE (
      fv.kind = 'display'
      AND fv.parent_id IS NULL
      AND fv.enabled = true
      AND fv.reference_status = 'VALID'
    )
    OR (
      fv.kind = 'source'
      AND fv.enabled = true
      AND parent_fv.id IS NOT NULL
    )
),
missing_requested_facets AS (
  SELECT r.facet_slug, r.value_handle
  FROM requested_facets r
  LEFT JOIN resolved_facets rf
    ON rf.requested_facet_slug = r.facet_slug
   AND rf.requested_value_handle = r.value_handle
  WHERE rf.value_key IS NULL
),
facet_resolution_guard AS (
  SELECT
    COUNT(*)::int AS missing_count,
    MIN(facet_slug || ':' || value_handle) AS first_missing_value
  FROM missing_requested_facets
),
search_candidate_products AS (
  SELECT
    CASE
      WHEN i.scope_kind = 'search'
      THEN COALESCE((
        SELECT rb_build_agg(c.product_doc_id)
        FROM (
          -- Full BM25 candidate relation for normalized project + locale + query.
          -- This relation must not be top-K capped before aggregates.
          SELECT pli.product_doc_id
          FROM listing.product_title_bm25_search_index ptsi
          JOIN listing.product_listing_index pli
            ON pli.project_id = ptsi.project_id
           AND pli.product_id = ptsi.product_id
          WHERE ptsi.project_id = i.project_id
            AND ptsi.locale = i.locale
            AND ptsi.status = 'published'
            AND pli.status = 'published'
            AND ptsi.title @@@ i.normalized_search_query
        ) c
      ), rb_build_empty())
      ELSE NULL
    END AS bitmap
  FROM input i
),
rule_collection_scope AS (
  -- For non-rule scopes this CTE returns one NULL row. For rule_collection the
  -- production compiler must replace this CTE with exactly one row containing:
  --   product_bitmap: product-level rule bitmap or projection of variant_bitmap
  --   variant_bitmap: same-variant rule bitmap on variant_doc_id, or NULL
  -- variant_bitmap must already be limited to in-stock variants.
  -- Leaving NULL/empty bitmaps for an actual rule_collection is a compiler bug.
  SELECT
    NULL::roaringbitmap AS product_bitmap,
    NULL::roaringbitmap AS variant_bitmap
  FROM input i
),
scope_variant_filters AS (
  SELECT variant_bitmap AS bitmap
  FROM rule_collection_scope
),
scope_products AS (
  SELECT
    CASE
      WHEN i.scope_kind IN ('category', 'manual_collection')
      THEN COALESCE((
        SELECT p.bitmap
        FROM listing.listing_posting_bitmap p
        WHERE p.project_id = i.project_id
          AND p.entity_type = 'product'
          AND p.field = CASE
            WHEN i.scope_kind = 'category' THEN 'category'
            ELSE 'collection'
          END
          AND p.value_key = i.scope_id::text
      ), rb_build_empty())
      WHEN i.scope_kind = 'global'
      THEN COALESCE((
        SELECT rb_build_agg(pli.product_doc_id)
        FROM listing.product_listing_index pli
        WHERE pli.project_id = i.project_id
          AND pli.status = 'published'
      ), rb_build_empty())
      WHEN i.scope_kind = 'search'
      THEN (SELECT bitmap FROM search_candidate_products)
      WHEN i.scope_kind = 'rule_collection'
      THEN (SELECT product_bitmap FROM rule_collection_scope)
      ELSE rb_build_empty()
    END AS bitmap
  FROM input i
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
    COALESCE(
      rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL),
      rb_build_empty()
    ) AS bitmap
  FROM resolved_facets rf
  JOIN input i ON true
  LEFT JOIN listing.listing_posting_bitmap p
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
    COALESCE(
      rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL),
      rb_build_empty()
    ) AS bitmap
  FROM input i
  CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json) v(vendor_id)
  LEFT JOIN listing.listing_posting_bitmap p
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
       AND (SELECT bitmap FROM scope_variant_filters) IS NULL
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
    COALESCE(
      rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL),
      rb_build_empty()
    ) AS bitmap
  FROM resolved_facets rf
  JOIN input i ON true
  LEFT JOIN listing.listing_posting_bitmap p
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
      WHEN (i.stock_filter_json->>'value')::boolean = true
      THEN (SELECT bitmap FROM in_stock_variants)
      WHEN (i.stock_filter_json->>'value')::boolean = false
       AND (
         EXISTS (SELECT 1 FROM option_filter_groups)
         OR i.price_filter_json <> '{}'::jsonb
       )
      THEN rb_build_empty()
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
        JOIN listing.variant_listing_index vli
          ON vli.project_id = vp.project_id
         AND vli.variant_doc_id = vp.variant_doc_id
         AND vli.product_doc_id = vp.product_doc_id
         AND vli.product_id = vp.product_id
         AND vli.in_stock = true
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
        OR (SELECT bitmap FROM scope_variant_filters) IS NOT NULL
      THEN (
        SELECT rb_and_agg(bitmap)
        FROM (
          SELECT bitmap FROM scope_variant_filters WHERE bitmap IS NOT NULL
          UNION ALL
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
      ELSE COALESCE((
        SELECT rb_build_agg(vli.product_doc_id)
        FROM listing.variant_listing_index vli
        JOIN input i ON true
        CROSS JOIN variant_filters vf
        WHERE vli.project_id = i.project_id
          AND vf.bitmap @> vli.variant_doc_id
      ), rb_build_empty())
    END AS bitmap
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
  CROSS JOIN facet_resolution_guard frg
  CROSS JOIN cursor_values c
  CROSS JOIN matches m
  WHERE s.project_id = i.project_id
    AND frg.missing_count = 0
    AND s.sort_kind = i.sort_kind
    AND s.locale = CASE WHEN i.sort_kind = 'name' THEN i.locale ELSE '' END
    AND s.currency = CASE
      WHEN i.sort_kind IN ('price_asc', 'price_desc') THEN i.currency
      ELSE ''
    END
    AND s.manual_scope_id = CASE
      WHEN i.sort_kind = 'manual'
       AND i.scope_kind IN ('category', 'manual_collection')
      THEN i.scope_id
      ELSE '00000000-0000-0000-0000-000000000000'::uuid
    END
    AND m.bitmap @> s.product_doc_id
    AND (
      NOT c.has_cursor
      OR COALESCE(s.bool_value, false) < c.cursor_in_stock
      OR (
        COALESCE(s.bool_value, false) = c.cursor_in_stock
        AND (
          (
            c.cursor_published_at IS NULL
            AND s.timestamptz_value IS NULL
            AND (
              (
                c.cursor_product_created_at IS NULL
                AND s.timestamptz_value_2 IS NULL
                AND s.product_id > c.cursor_product_id
              )
              OR (
                c.cursor_product_created_at IS NOT NULL
                AND (
                  s.timestamptz_value_2 < c.cursor_product_created_at
                  OR s.timestamptz_value_2 IS NULL
                  OR (
                    s.timestamptz_value_2 = c.cursor_product_created_at
                    AND s.product_id > c.cursor_product_id
                  )
                )
              )
            )
          )
          OR (
            c.cursor_published_at IS NOT NULL
            AND (
              s.timestamptz_value < c.cursor_published_at
              OR s.timestamptz_value IS NULL
              OR (
                s.timestamptz_value = c.cursor_published_at
                AND (
                  (
                    c.cursor_product_created_at IS NULL
                    AND s.timestamptz_value_2 IS NULL
                    AND s.product_id > c.cursor_product_id
                  )
                  OR (
                    c.cursor_product_created_at IS NOT NULL
                    AND (
                      s.timestamptz_value_2 < c.cursor_product_created_at
                      OR s.timestamptz_value_2 IS NULL
                      OR (
                        s.timestamptz_value_2 = c.cursor_product_created_at
                        AND s.product_id > c.cursor_product_id
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  ORDER BY
    COALESCE(s.bool_value, false) DESC,
    s.timestamptz_value DESC NULLS LAST,
    s.timestamptz_value_2 DESC NULLS LAST,
    s.product_id ASC
  LIMIT (SELECT first + 1 FROM input)
)
SELECT jsonb_build_object(
  'facetResolutionError',
    (
      SELECT CASE
        WHEN missing_count > 0
        THEN jsonb_build_object(
          'code', 'UNKNOWN_FACET_VALUE',
          'value', first_missing_value
        )
        ELSE NULL
      END
      FROM facet_resolution_guard
    ),
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
  генерировать конкретный `ORDER BY` и matching keyset seek predicate, а не
  универсальный CASE.
- Для product aggregate `price_asc` / `price_desc` collector не должен терять
  unpriced products. Он обязан читать product sort rows с `bigint_value IS NULL`
  и сохранять `NULLS LAST` semantics, если нет active option/price predicate,
  требующего matched variant price collector.
- Для `manual` product-sort branch фильтр по `manual_scope_id` обязателен. Для
  category scope это `category_id`, для manual collection scope это
  `collection_id`, для остальных product-sort branches используется zero UUID.
- Для matched variant price sort compiler должен заменить `page_scan` на branch
  по `listing_posting_variant_price`.
- Для relevance sort compiler должен заменить `page_scan` на BM25 branch.
- `facetResolutionError` является internal field SQL result. Repository mapper
  обязан бросить domain error до маппинга page rows, если это поле не `null`; в
  public listing response это поле не возвращается.
- Query A/B/C/D/E должны использовать один и тот же compiler для `vendor`,
  `price`, stock-only, search scope и rule collection variant scope. Пример выше
  показывает форму CTE, но production compiler обязан подставить также
  `scope_variant_filters` и BM25 scope branch для соответствующих scopes.
- `rule_collection_scope` в примере является compiler insertion point.
  Production SQL не имеет права оставить actual rule collection с `NULL` product
  scope или empty scope по умолчанию: product-level rules, variant-level rules and
  their projection must be compiled according to the rule collection input.

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
  'facetResolutionError',
    (
      SELECT CASE
        WHEN missing_count > 0
        THEN jsonb_build_object(
          'code', 'UNKNOWN_FACET_VALUE',
          'value', first_missing_value
        )
        ELSE NULL
      END
      FROM facet_resolution_guard
    ),
  'totalCount', (SELECT value FROM total_count)
) AS result;
```

Notes:

- Если implementation использует SQL-level facet resolution guard вместо
  pre-SQL validation, Query B возвращает тот же internal `facetResolutionError`,
  что Query A, и mapper бросает domain error до чтения `totalCount`.

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
  CROSS JOIN scope_variant_filters svf
  WHERE vli.project_id = i.project_id
    AND vli.in_stock = true
    AND sp.bitmap @> vli.product_doc_id
    AND (svf.bitmap IS NULL OR svf.bitmap @> vli.variant_doc_id)
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
    fv.sort_index AS value_sort,
    f.id::text || ':' || fv.id::text AS value_key
  FROM input i
  JOIN candidate_values cv ON true
  JOIN catalog.facet f
    ON f.project_id = i.project_id
  JOIN catalog.facet_value fv
    ON fv.project_id = f.project_id
   AND fv.facet_id = f.id
   AND cv.value_key = f.id::text || ':' || fv.id::text
   AND fv.kind = 'display'
   AND fv.parent_id IS NULL
   AND fv.enabled = true
   AND fv.reference_status = 'VALID'
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
      ORDER BY fv.value_sort, fv.facet_value_id
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
- Для search scope это означает published/scope bitmap intersect BM25 candidate
  bitmap. Для rule collection scope это означает product projection из
  rule-level variant predicates, если они есть.
- Query C должен строить candidate values двумя typed путями: product postings
  через `entity_type = 'product'` и option postings через
  `entity_type = 'variant'`. Нельзя проверять option values через product doc id
  bitmap.
- Query C должен возвращать только enabled root display values
  (`kind = 'display'`, `parent_id IS NULL`, `enabled = true`,
  `reference_status = 'VALID'`) и сортировать values по storefront order
  (`sort_index`, затем stable id).
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

Query D не имеет права silently truncate counts. Если количество configured
visible candidate values большое, Query D всё равно должен вернуть полный
counts map для всех values, которые входят в metadata. `LIMIT` в count SQL
запрещен, потому это создает partial counts при full response contract.

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
  CROSS JOIN scope_variant_filters svf
  WHERE vli.project_id = i.project_id
    AND vli.in_stock = true
    AND sp.bitmap @> vli.product_doc_id
    AND (svf.bitmap IS NULL OR svf.bitmap @> vli.variant_doc_id)
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
visible_facet_values AS (
  SELECT DISTINCT
    f.id::text AS facet_id,
    f.facet_type,
    fv.id::text AS facet_value_id,
    fv.sort_index AS value_sort,
    f.id::text || ':' || fv.id::text AS value_key
  FROM input i
  JOIN candidate_values cv ON true
  JOIN catalog.facet f
    ON f.project_id = i.project_id
  JOIN catalog.facet_value fv
    ON fv.project_id = f.project_id
   AND fv.facet_id = f.id
   AND cv.value_key = f.id::text || ':' || fv.id::text
   AND fv.kind = 'display'
   AND fv.parent_id IS NULL
   AND fv.enabled = true
   AND fv.reference_status = 'VALID'
),
product_facet_values AS (
  SELECT *
  FROM visible_facet_values
  WHERE facet_type IN ('TAG', 'FEATURE')
  ORDER BY facet_id, value_sort, facet_value_id
),
option_facet_values AS (
  SELECT *
  FROM visible_facet_values
  WHERE facet_type = 'OPTION'
  ORDER BY facet_id, value_sort, facet_value_id
),
facet_values AS (
  SELECT * FROM product_facet_values
  UNION ALL
  SELECT * FROM option_facet_values
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
          SELECT rb_and_agg(bitmap) AS bitmap
          FROM (
            SELECT pfg.bitmap
            FROM product_filter_groups pfg
            WHERE pfg.facet_id <> pvb.facet_id

            UNION ALL

            SELECT bitmap FROM vendor_filter_group
            WHERE EXISTS (
              SELECT 1
              FROM input i
              CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json)
                v(vendor_id)
            )

            UNION ALL

            SELECT bitmap
            FROM active_stock_product_filter
            WHERE bitmap IS NOT NULL
          ) isolated_product_filter_parts
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
),
option_facet_counts AS (
  SELECT
    ovb.facet_id,
    ovb.facet_type,
    ovb.value_key,
    rb_cardinality(
      (
        SELECT COALESCE(rb_build_agg(vli.product_doc_id), rb_build_empty())
        FROM (
          SELECT rb_and_agg(option_variant_parts.bitmap) AS bitmap
          FROM in_stock_variants
          CROSS JOIN LATERAL (
            SELECT COALESCE(
              (SELECT bitmap FROM active_stock_variant_filter),
              in_stock_variants.bitmap
            ) AS bitmap
          ) option_count_stock_filter
          CROSS JOIN price_variant_filter
          CROSS JOIN LATERAL (
            SELECT rb_and_agg(ofg.bitmap) AS bitmap
            FROM option_filter_groups ofg
            WHERE ofg.facet_id <> ovb.facet_id
          ) isolated_option_filters
          CROSS JOIN LATERAL (
            SELECT bitmap
            FROM (
              SELECT option_count_stock_filter.bitmap
              UNION ALL
              SELECT scope_variant_filters.bitmap
              FROM scope_variant_filters
              WHERE scope_variant_filters.bitmap IS NOT NULL
              UNION ALL
              SELECT isolated_option_filters.bitmap
              WHERE isolated_option_filters.bitmap IS NOT NULL
              UNION ALL
              SELECT price_variant_filter.bitmap
              WHERE price_variant_filter.bitmap IS NOT NULL
              UNION ALL
              SELECT ovb.value_bitmap
            ) option_variant_parts
          ) option_variant_parts
        ) option_variant_bitmap
        JOIN input i ON true
        JOIN listing.variant_listing_index vli
          ON vli.project_id = i.project_id
         AND option_variant_bitmap.bitmap @> vli.variant_doc_id
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

- `product_facet_values` и `option_facet_values` не должны ограничиваться через
  SQL `LIMIT`: counts обязаны быть complete для всех values, которые Query C
  вернула в metadata.
- Если implementation использует SQL-level facet resolution guard вместо
  pre-SQL validation, Query D также возвращает internal `facetResolutionError` и
  mapper бросает domain error до merge counts с metadata.
- Query D должен использовать те же product/variant candidate rules, что Query C.
  Product candidate values проверяются через `scope_product_base`, option
  candidate values должны быть ограничены variant scope branch-ом compiler-а, а
  не product bitmap intersection.
- Для search scope candidate rules включают BM25 candidate bitmap; для rule
  collection они включают projected product scope из rule-level variant
  predicates.
- `facet_values` не должен парсить `p.value_key` через
  `split_part(...)::uuid`. Query D должен получать тот же opaque `valueKey`,
  который Query C строит из typed metadata.
- Query D должен считать только enabled root display values
  (`kind = 'display'`, `parent_id IS NULL`, `enabled = true`,
  `reference_status = 'VALID'`) и использовать тот же storefront value order,
  что Query C. Counts должны быть complete для всех values, которые Query C
  вернет в metadata.
- Product counts исключают active product group того же `facet_id`.
- Product counts не должны исключать другие product-level filters: vendor group и
  active stock-only product filter остаются в isolated product base.
- Option counts исключают active option group того же `facet_id`, но сохраняют
  same-variant semantics до projection.
- Option counts сохраняют active stock predicate на variant base. Если active
  `in_stock = false` пришел вместе с option/price path, stock bitmap является
  empty bitmap, потому out-of-stock variants не могут давать option counts.
- Option counts должны сохранять active price predicate в variant base. Иначе
  counts при active price filter описывают не текущий filtered listing scope.
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

`variant_filters_without_price` должен включать rule-level variant scope, active
option facet groups и active stock predicate, но не должен включать active price
predicate. Для `priceRange` stock isolation отличается от Query A:
`in_stock = true` означает in-stock variants, `in_stock = false` означает empty
variant bitmap и приводит к `priceRange = null`, потому price index читает только
in-stock priced variants. Иначе `priceRange` станет диапазоном внутри уже
выбранного price bucket вместо диапазона доступных цен для текущих
product/option/stock filters.

`variant_filters_without_stock` должен включать rule-level variant scope, active
option facet groups и active price predicate, но не должен включать active stock
predicate. Иначе active option/price predicates могут потеряться при расчете
`inStockCount`.

```sql
WITH
-- input/resolved_facets/scope/published/product_filter_groups/
-- vendor_filter_group/option_filter_groups/in_stock_variants CTE как в Query A
-- scope CTE обязан включать search BM25 bitmap и rule collection variant scope
-- product_filters_without_stock здесь не включает active in-stock predicate
-- price_variant_filter строится из active price predicate, NULL если его нет
-- price_range_stock_filter строится отдельно от Query A stock CTE:
--   true => in_stock_variants, false => empty bitmap, missing => NULL
product_filters_without_stock AS (
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
  ) x
),
product_base AS (
  SELECT
    CASE
      WHEN product_filters_without_stock.bitmap IS NOT NULL
      THEN scope_products.bitmap & published_products.bitmap & product_filters_without_stock.bitmap
      ELSE scope_products.bitmap & published_products.bitmap
    END AS bitmap
  FROM scope_products
  CROSS JOIN published_products
  CROSS JOIN product_filters_without_stock
),
option_variant_filters AS (
  SELECT rb_and_agg(bitmap) AS bitmap
  FROM (
    SELECT bitmap
    FROM scope_variant_filters
    WHERE bitmap IS NOT NULL
    UNION ALL
    SELECT bitmap
    FROM option_filter_groups
  ) option_variant_filter_parts
),
price_range_stock_filter AS (
  SELECT
    CASE
      WHEN (i.stock_filter_json->>'value')::boolean = true
      THEN (SELECT bitmap FROM in_stock_variants)
      WHEN (i.stock_filter_json->>'value')::boolean = false
      THEN rb_build_empty()
      ELSE NULL
    END AS bitmap
  FROM input i
),
variant_filters_without_price AS (
  SELECT
    CASE
      WHEN ovf.bitmap IS NOT NULL AND prsf.bitmap IS NOT NULL
      THEN ovf.bitmap & prsf.bitmap
      WHEN ovf.bitmap IS NOT NULL
      THEN ovf.bitmap
      WHEN prsf.bitmap IS NOT NULL
      THEN prsf.bitmap
      ELSE NULL
    END AS bitmap
  FROM option_variant_filters ovf
  CROSS JOIN price_range_stock_filter prsf
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
  SELECT
    CASE
      WHEN bounds.min_price_minor IS NULL OR bounds.max_price_minor IS NULL
      THEN NULL
      ELSE jsonb_build_object(
        'minPriceMinor', bounds.min_price_minor,
        'maxPriceMinor', bounds.max_price_minor,
        'currency', (SELECT currency FROM input)
      )
    END AS value
  FROM (
    SELECT
      MIN(vp.price_minor) AS min_price_minor,
      MAX(vp.price_minor) AS max_price_minor
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
  ) bounds
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
  SELECT COALESCE(rb_build_agg(vli.product_doc_id), rb_build_empty()) AS bitmap
  FROM in_stock_variant_matches isvm
  JOIN input i ON true
  JOIN listing.variant_listing_index vli
    ON vli.project_id = i.project_id
   AND isvm.bitmap @> vli.variant_doc_id
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

- `product_base` не должен включать active in-stock predicate. Он строится через
  `product_filters_without_stock`, где остаются product facet/vendor filters, но
  нет `active_stock_product_filter`. Stock predicate обрабатывается только через
  `price_range_stock_filter` для `priceRange` и полностью исключается из
  `inStockCount`.
- `priceRange` исключает active price predicate, но сохраняет product, option и
  active stock filters. Если active stock filter равен `false`, price range
  возвращается как `null`, потому price index читает только in-stock variants.
- `inStockCount` исключает active in-stock predicate, но сохраняет product,
  option и active price filters. Option/price predicates пересекаются с
  `in_stock_variants` до projection, чтобы сохранить same-variant semantics.
- Для search scope `product_base` должен быть ограничен BM25 candidate bitmap.
  Для rule collection scope `product_base` и isolated variant filters должны
  сохранять rule-level variant predicates до projection.
- Query E отделен от facet counts, потому virtual facets обычно дешевле и не
  должны ждать тяжелую facet bucket aggregation внутри одного плана.
- Если implementation использует SQL-level facet resolution guard вместо
  pre-SQL validation, Query E также возвращает internal `facetResolutionError` и
  mapper бросает domain error до чтения `priceRange` / `inStockCount`.

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
- filter shape stats;
- selected collector;
- aggregate workload: counted facet values, option values, rule predicates.

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
- missing facet value дает тот же domain error во всех branches или отклоняется
  до запуска branches;
- enabled root display/source-child facet value resolution одинаковый для active
  filter resolution, Query C metadata и Query D counts, and uses real catalog
  schema columns from migrations, including `sort_index`, `enabled` and
  `reference_status`.

### Фаза 3. Query A

Реализовать `page rows + hasNextPage`.

Acceptance:

- Query A делает 1 SQL round-trip;
- покрыты все product sort collectors (`manual`, `newest`, `created`, `name`,
  `price_asc`, `price_desc`) отдельными order/seek templates;
- matched variant price collector использует `variant_doc_id` tie-breaker и
  same-variant bitmap;
- product aggregate price collectors preserve unpriced products with
  `NULLS LAST`;
- relevance collector использует полный BM25 candidate scope;
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
- возвращает только enabled root display values;
- порядок facets/values соответствует storefront order;
- search/rule collection scope совпадает с Query A/B/D/E;
- `valueKey` строится из typed metadata через shared helper/compiler, без
  `split_part(...)::uuid` в SQL.

### Фаза 6. Query D

Реализовать all facet counts.

Acceptance:

- Query D делает 1 SQL round-trip;
- product facet isolation корректна;
- option facet same-variant semantics корректна;
- возвращает counts map по `valueKey`;
- product и option counts считаются без silent truncation;
- counts считаются только для enabled root display values;
- counts complete для всех values из Query C metadata;
- search/rule collection scope совпадает с Query A/B/C/E;
- counts используют тот же opaque `valueKey`, что Query C, без ad hoc SQL
  parsing.

### Фаза 7. Query E

Реализовать price range и in-stock count.

Acceptance:

- Query E делает 1 SQL round-trip;
- active price predicate исключается из price range;
- price range сохраняет active option facet filters;
- active in-stock predicate исключается из in-stock count;
- active `in_stock = false` возвращает `priceRange = null`, но не исключается из
  `inStockCount`;
- `variant_filters_without_price` и `variant_filters_without_stock`
  компилируются отдельно;
- `product_base` не включает active in-stock predicate;
- search scope ограничивает virtual facets BM25 candidate bitmap;
- rule collection variant predicates сохраняются в virtual facet bases;
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

### Фаза 10. Performance gate

Включить:

- performance metrics for each parallel branch;
- removal of sequential fan-out path after supported scope/collector parity.

Acceptance:

- repository p95 укладывается в `<= 100ms` на agreed representative dataset;
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
- Facet counts остаются главным риском для 100ms и требуют отдельного profiling
  на representative data.
- Без новых индексов, cache и материализации нельзя исправить все data-shape
  проблемы только SQL rewrite.

## Итоговая целевая метрика

```text
Full listing response: <= 5 PostgreSQL queries
Execution model: 5 parallel independent read branches
Required response fields: rows, hasNextPage, totalCount, facets, priceRange, inStockCount
Repository duration p95: <= 100ms on agreed representative dataset
Cache/materialization/new PostgreSQL data: none
```
