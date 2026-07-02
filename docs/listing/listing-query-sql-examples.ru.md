# SQL-примеры listing query для roaring bitmap подхода

Документ дополняет:

- `docs/listing/listing-index-redesign-plan.ru.md`
- `docs/listing/listing-index-db-schema.ru.md`
- `docs/listing/listing-posting-list-search-engine-index.ru.md`

Цель - зафиксировать типовые SQL shapes для storefront listing после перехода
на PostgreSQL roaring posting index. Старый row-based подход с
`listing_posting_bitmap.product_id`, `variant_id`, `facet_id` и
`facet_value_id` больше не используется: `catalog.listing_posting_bitmap`
хранит compressed `roaringbitmap` rows keyed by
`project_id + entity_type + field + value_key`.

## Общие правила

Все примеры предполагают:

- `:projectId` - текущий project boundary;
- `:currency` - default storefront currency проекта;
- `:locale` - storefront locale;
- `:first` - page size;
- `:firstPlusOne` - `:first + 1` для cursor pagination без `totalCount`;
- `:zeroManualScopeId` - zero UUID для sort rows без manual scope;
- `:...ValueKey` для facet postings уже normalized как
  `<facet_id>:<facet_value_id>`;
- cursor pagination добавляет keyset predicates по тем же sort keys;
- storefront query всегда работает только внутри одного `project_id`;
- raw source handles на read path не используются;
- `price` и `in_stock` являются virtual facets и не представлены generic
  rows в `catalog.listing_posting_bitmap`;
- page collector возвращает `product_doc_id`, `product_id` и sort keys, а
  hydration карточек товара выполняется отдельным batch pipeline.
- для краткости SQL snippets предполагают, что referenced posting rows
  существуют. Реальный query builder должен трактовать missing value posting
  как empty bitmap: внутри OR-группы он просто не добавляет matches, а весь
  required filter group становится empty только когда missing/empty все
  выбранные values этой группы.

Runtime code использует `pg_roaringbitmap` напрямую. Без промежуточных project-owned функций поверх extension API.

```sql
rb_build_agg(doc_id int) -> roaringbitmap
(a roaringbitmap & b roaringbitmap) -> roaringbitmap
rb_and_agg(bitmap roaringbitmap) -> roaringbitmap
(a roaringbitmap | b roaringbitmap) -> roaringbitmap
rb_or_agg(bitmap roaringbitmap) -> roaringbitmap
(a roaringbitmap - b roaringbitmap) -> roaringbitmap
rb_cardinality(bitmap roaringbitmap) -> bigint
bitmap roaringbitmap @> doc_id int -> boolean
rb_iterate(bitmap roaringbitmap) -> setof int
```

Для projection variant bitmap -> product bitmap ниже используется query-builder
macro:

- `project_variant_bitmap_to_products(variant_bitmap)` - generated projection
  block из `catalog.listing_posting_variant_projection_block`, который
  возвращает product bitmap. Для узких sets допустим fallback через
  `rb_iterate` + `variant_listing_index`, но broad option filters
  должны использовать projection blocks.

Этот macro не является DDL-именем функции. Implementation должен inline-ить SQL
projection block в generated query; не создавать helper function без отдельного
schema decision.

Условный inline shape для macro:

```sql
WITH matched_blocks AS (
  SELECT
    b.block_id,
    b.variant_doc_from,
    b.variant_doc_to,
    b.variant_bitmap,
    b.product_bitmap,
    b.variant_count,
    (:variantBitmap::roaringbitmap & b.variant_bitmap) AS block_match
  FROM catalog.listing_posting_variant_projection_block b
  WHERE b.project_id = :projectId
    AND rb_cardinality(:variantBitmap::roaringbitmap & b.variant_bitmap) > 0
),
full_block_products AS (
  SELECT mb.product_bitmap
  FROM matched_blocks mb
  WHERE rb_cardinality(mb.block_match) = mb.variant_count
),
partial_block_products AS (
  SELECT rb_build_agg(vli.product_doc_id) AS product_bitmap
  FROM matched_blocks mb
  JOIN catalog.variant_listing_index vli
    ON vli.project_id = :projectId
   AND vli.variant_doc_id >= mb.variant_doc_from
   AND vli.variant_doc_id < mb.variant_doc_to
  WHERE rb_cardinality(mb.block_match) < mb.variant_count
    AND mb.block_match @> vli.variant_doc_id
),
projected AS (
  SELECT rb_or_agg(product_bitmap) AS product_bitmap
  FROM (
    SELECT product_bitmap FROM full_block_products
    UNION ALL
    SELECT product_bitmap FROM partial_block_products
  ) x
)
SELECT product_bitmap
FROM projected;
```

## Bitmap building blocks

Single product posting row:

```sql
SELECT p.bitmap
FROM catalog.listing_posting_bitmap p
WHERE p.project_id = :projectId
  AND p.entity_type = 'product'
  AND p.field = 'category'
  AND p.value_key = :categoryId::text;
```

Single variant posting row:

```sql
SELECT p.bitmap
FROM catalog.listing_posting_bitmap p
WHERE p.project_id = :projectId
  AND p.entity_type = 'variant'
  AND p.field = 'facet'
  AND p.value_key = :colorBlackValueKey;
```

OR внутри одного facet, AND между разными facets:

```sql
WITH brand_filter AS (
  SELECT (nike.bitmap | adidas.bitmap) AS product_bitmap
  FROM catalog.listing_posting_bitmap nike
  CROSS JOIN catalog.listing_posting_bitmap adidas
  WHERE nike.project_id = :projectId
    AND nike.entity_type = 'product'
    AND nike.field = 'facet'
    AND nike.value_key = :brandNikeValueKey
    AND adidas.project_id = :projectId
    AND adidas.entity_type = 'product'
    AND adidas.field = 'facet'
    AND adidas.value_key = :brandAdidasValueKey
),
material_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :materialLeatherValueKey
)
SELECT (brand_filter.product_bitmap & material_filter.product_bitmap)
FROM brand_filter
CROSS JOIN material_filter;
```

Global published scope может быть отдельным product posting row, если sync
pipeline поддерживает такой physical index. Если такого row нет, query builder
строит bitmap из `product_listing_index`:

```sql
SELECT rb_build_agg(pli.product_doc_id) AS product_bitmap
FROM catalog.product_listing_index pli
WHERE pli.project_id = :projectId
  AND pli.status = 'published';
```

Price range строится из typed in-stock price index, а не из generic facet row:

```sql
SELECT rb_build_agg(vp.variant_doc_id) AS variant_bitmap
FROM catalog.listing_posting_variant_price vp
WHERE vp.project_id = :projectId
  AND vp.currency = :currency
  AND vp.price_minor >= :minPriceMinor
  AND vp.price_minor <= :maxPriceMinor;
```

Option-only filtering still needs in-stock semantics. Because `in_stock` is a
virtual facet and not a default posting row, build the in-stock variant bitmap
from `variant_listing_index` unless a future controlled physical index is added:

```sql
SELECT rb_build_agg(vli.variant_doc_id) AS variant_bitmap
FROM catalog.variant_listing_index vli
WHERE vli.project_id = :projectId
  AND vli.in_stock = true;
```

## 1. Category scope + vendor filter + newest sort

Самый дешевый category PLP path: category scope и vendor filter уже являются
product bitmaps. Page collector сканирует physical sort rows и проверяет
membership через оператор `@>`.

```sql
WITH category_scope AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'category'
    AND p.value_key = :categoryId::text
),
vendor_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'vendor'
    AND p.value_key = :vendorId::text
),
matches AS (
  SELECT (category_scope.product_bitmap & vendor_filter.product_bitmap)
    AS product_bitmap
  FROM category_scope
  CROSS JOIN vendor_filter
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.timestamptz_value AS published_at,
  s.timestamptz_value_2 AS product_created_at
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'newest'
 AND s.locale = ''
 AND s.currency = ''
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.timestamptz_value DESC NULLS LAST,
  s.timestamptz_value_2 DESC NULLS LAST,
  s.product_id ASC
LIMIT :first;
```

`category_scope` должен содержать только published product docs for storefront
visibility. Если sync хранит draft rows в scope bitmap, query обязан
дополнительно AND-ить published/global visibility bitmap.

## 2. Manual collection + product facet filter + manual sort

Manual order хранится как derived sort rows в
`catalog.listing_posting_product_sort`. Product facet filter работает bitmap
операцией, а не `EXISTS` по row postings.

```sql
WITH collection_scope AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'collection'
    AND p.value_key = :collectionId::text
),
tag_filter AS (
  SELECT (sale.bitmap | outlet.bitmap) AS product_bitmap
  FROM catalog.listing_posting_bitmap sale
  CROSS JOIN catalog.listing_posting_bitmap outlet
  WHERE sale.project_id = :projectId
    AND sale.entity_type = 'product'
    AND sale.field = 'facet'
    AND sale.value_key = :tagSaleValueKey
    AND outlet.project_id = :projectId
    AND outlet.entity_type = 'product'
    AND outlet.field = 'facet'
    AND outlet.value_key = :tagOutletValueKey
),
matches AS (
  SELECT (collection_scope.product_bitmap & tag_filter.product_bitmap)
    AS product_bitmap
  FROM collection_scope
  CROSS JOIN tag_filter
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.text_value AS manual_rank
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'manual'
 AND s.locale = ''
 AND s.currency = ''
 AND s.manual_scope_id = :collectionId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.text_value ASC NULLS LAST,
  s.product_id ASC
LIMIT :first;
```

## 3. Global listing + several product facets + created sort

Global catalog scope широкий. Если отдельного `all_products/published`
posting row нет, bitmap строится из `product_listing_index`.

```sql
WITH global_scope AS (
  SELECT rb_build_agg(pli.product_doc_id) AS product_bitmap
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
),
brand_filter AS (
  SELECT (nike.bitmap | adidas.bitmap) AS product_bitmap
  FROM catalog.listing_posting_bitmap nike
  CROSS JOIN catalog.listing_posting_bitmap adidas
  WHERE nike.project_id = :projectId
    AND nike.entity_type = 'product'
    AND nike.field = 'facet'
    AND nike.value_key = :brandNikeValueKey
    AND adidas.project_id = :projectId
    AND adidas.entity_type = 'product'
    AND adidas.field = 'facet'
    AND adidas.value_key = :brandAdidasValueKey
),
material_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :materialLeatherValueKey
),
matches AS (
  SELECT (global_scope.product_bitmap & brand_filter.product_bitmap & material_filter.product_bitmap) AS product_bitmap
  FROM global_scope
  CROSS JOIN brand_filter
  CROSS JOIN material_filter
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.timestamptz_value AS product_created_at
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'created'
 AND s.locale = ''
 AND s.currency = ''
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.timestamptz_value DESC,
  s.product_id ASC
LIMIT :first;
```

Total count для того же filtered scope не требует отдельного row scan:

```sql
SELECT rb_cardinality(product_bitmap) AS total_count
FROM matches;
```

## 4. Category scope + option filters + newest sort

Option filters должны совпасть на одном in-stock variant. Поэтому OR внутри
option facet строится на variant bitmaps, а AND между option facets выполняется
до projection в product docs.

```sql
WITH category_scope AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'category'
    AND p.value_key = :categoryId::text
),
color_filter AS (
  SELECT (black.bitmap | white.bitmap) AS variant_bitmap
  FROM catalog.listing_posting_bitmap black
  CROSS JOIN catalog.listing_posting_bitmap white
  WHERE black.project_id = :projectId
    AND black.entity_type = 'variant'
    AND black.field = 'facet'
    AND black.value_key = :colorBlackValueKey
    AND white.project_id = :projectId
    AND white.entity_type = 'variant'
    AND white.field = 'facet'
    AND white.value_key = :colorWhiteValueKey
),
size_filter AS (
  SELECT p.bitmap AS variant_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'variant'
    AND p.field = 'facet'
    AND p.value_key = :size42ValueKey
),
in_stock_variants AS (
  SELECT rb_build_agg(vli.variant_doc_id) AS variant_bitmap
  FROM catalog.variant_listing_index vli
  WHERE vli.project_id = :projectId
    AND vli.in_stock = true
),
variant_matches AS (
  SELECT (color_filter.variant_bitmap & size_filter.variant_bitmap & in_stock_variants.variant_bitmap) AS variant_bitmap
  FROM color_filter
  CROSS JOIN size_filter
  CROSS JOIN in_stock_variants
),
projected_variant_matches AS (
  SELECT project_variant_bitmap_to_products(variant_matches.variant_bitmap)
    AS product_bitmap
  FROM variant_matches
),
matches AS (
  SELECT (category_scope.product_bitmap & projected_variant_matches.product_bitmap) AS product_bitmap
  FROM category_scope
  CROSS JOIN projected_variant_matches
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.timestamptz_value AS published_at,
  s.timestamptz_value_2 AS product_created_at
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'newest'
 AND s.locale = ''
 AND s.currency = ''
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.timestamptz_value DESC NULLS LAST,
  s.timestamptz_value_2 DESC NULLS LAST,
  s.product_id ASC
LIMIT :first;
```

Variant option posting rows do not replace the virtual `in_stock` predicate.
When no price filter is active, query builder must add the in-stock variant
bitmap before projection.

## 5. Product filters + product aggregate price sort

Когда нет active option filters и нет price range predicate, `price_asc` /
`price_desc` могут читать derived product aggregate sort rows. Это ordered
access path, а не source of truth; source/debug layer остается в
`product_listing_price_index`.

```sql
WITH category_scope AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'category'
    AND p.value_key = :categoryId::text
),
brand_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :brandNikeValueKey
),
matches AS (
  SELECT (category_scope.product_bitmap & brand_filter.product_bitmap)
    AS product_bitmap
  FROM category_scope
  CROSS JOIN brand_filter
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.bigint_value AS min_price_minor
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'price_asc'
 AND s.locale = ''
 AND s.currency = :currency
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.bigint_value ASC NULLS LAST,
  s.product_id ASC
LIMIT :first;
```

Если активен price range или option filter, price sort должен перейти на
matched variant price collector из следующего раздела.

## 6. Option filters + price range + matched price ascending sort

Это основной same-variant path: option bitmaps и price bitmap пересекаются на
`variant_doc_id`, затем результат project-ится в product docs. Page collector
сканирует `listing_posting_variant_price` в price order и дедуплицирует product
без смены leading order на `product_id`.

SQL ниже показывает correctness/reference shape: он выбирает lowest matching
variant per product через anti-join и сохраняет итоговый order by price. Для
runtime hot path, особенно когда у товаров много matching variants, preferred
strategy - читать `listing_posting_variant_price` ordered chunks по нужному
price index, проверять membership bitmaps, дедуплицировать `product_id` в
application layer и продолжать overfetch, пока не набран `:firstPlusOne`.
Anti-join shape допустим для узких фильтров, diagnostics и fallback, но не
должен быть единственным planned implementation для high-duplication products.

```sql
WITH base_scope AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'category'
    AND p.value_key = :categoryId::text
),
brand_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :brandNikeValueKey
),
color_filter AS (
  SELECT p.bitmap AS variant_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'variant'
    AND p.field = 'facet'
    AND p.value_key = :colorBlackValueKey
),
size_filter AS (
  SELECT p.bitmap AS variant_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'variant'
    AND p.field = 'facet'
    AND p.value_key = :size42ValueKey
),
price_filter AS (
  SELECT rb_build_agg(vp.variant_doc_id) AS variant_bitmap
  FROM catalog.listing_posting_variant_price vp
  WHERE vp.project_id = :projectId
    AND vp.currency = :currency
    AND vp.price_minor >= :minPriceMinor
    AND vp.price_minor <= :maxPriceMinor
),
variant_matches AS (
  SELECT (color_filter.variant_bitmap & size_filter.variant_bitmap & price_filter.variant_bitmap) AS variant_bitmap
  FROM color_filter
  CROSS JOIN size_filter
  CROSS JOIN price_filter
),
projected_variant_matches AS (
  SELECT project_variant_bitmap_to_products(variant_matches.variant_bitmap)
    AS product_bitmap
  FROM variant_matches
),
product_matches AS (
  SELECT (base_scope.product_bitmap & brand_filter.product_bitmap & projected_variant_matches.product_bitmap) AS product_bitmap
  FROM base_scope
  CROSS JOIN brand_filter
  CROSS JOIN projected_variant_matches
),
page_products AS (
  SELECT
    vp.product_doc_id,
    vp.product_id,
    vp.variant_doc_id,
    vp.price_minor
  FROM variant_matches vm
  CROSS JOIN product_matches pm
  JOIN catalog.listing_posting_variant_price vp
    ON vp.project_id = :projectId
   AND vp.currency = :currency
  WHERE vm.variant_bitmap @> vp.variant_doc_id
    AND pm.product_bitmap @> vp.product_doc_id
    AND NOT EXISTS (
      SELECT 1
      FROM catalog.listing_posting_variant_price earlier
      WHERE earlier.project_id = :projectId
        AND earlier.currency = :currency
        AND earlier.product_id = vp.product_id
        AND vm.variant_bitmap @> earlier.variant_doc_id
        AND pm.product_bitmap @> earlier.product_doc_id
        AND (
          earlier.price_minor < vp.price_minor
          OR (
            earlier.price_minor = vp.price_minor
            AND earlier.variant_doc_id < vp.variant_doc_id
          )
        )
    )
  ORDER BY
    vp.price_minor ASC,
    vp.product_id ASC,
    vp.variant_doc_id ASC
  LIMIT :first
)
SELECT
  pp.product_doc_id,
  pp.product_id,
  pp.variant_doc_id AS matched_variant_doc_id,
  pp.price_minor AS matched_min_price_minor
FROM page_products pp;
```

Для `price_desc` collector использует `idx_listing_posting_variant_price_desc`,
выбирает highest matching variant per product и меняет order direction на
`price_minor DESC`. Chunked application dedupe остается preferred hot-path
strategy для high-duplication products; SQL anti-join остается reference/fallback
shape.

## 7. Name sort + product and option filters

Locale-dependent name sort должен идти через derived `product_sort` rows
(`sort_kind = 'name'`), а не через ad hoc join к `product_translation` в hot
path.

```sql
WITH global_scope AS (
  SELECT rb_build_agg(pli.product_doc_id) AS product_bitmap
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
),
brand_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :brandNikeValueKey
),
color_filter AS (
  SELECT p.bitmap AS variant_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'variant'
    AND p.field = 'facet'
    AND p.value_key = :colorBlackValueKey
),
in_stock_variants AS (
  SELECT rb_build_agg(vli.variant_doc_id) AS variant_bitmap
  FROM catalog.variant_listing_index vli
  WHERE vli.project_id = :projectId
    AND vli.in_stock = true
),
variant_matches AS (
  SELECT (color_filter.variant_bitmap & in_stock_variants.variant_bitmap)
    AS variant_bitmap
  FROM color_filter
  CROSS JOIN in_stock_variants
),
projected_color AS (
  SELECT project_variant_bitmap_to_products(variant_matches.variant_bitmap)
    AS product_bitmap
  FROM variant_matches
),
matches AS (
  SELECT (global_scope.product_bitmap & brand_filter.product_bitmap & projected_color.product_bitmap) AS product_bitmap
  FROM global_scope
  CROSS JOIN brand_filter
  CROSS JOIN projected_color
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.text_value AS name_sort_value
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'name'
 AND s.locale = :locale
 AND s.currency = ''
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.text_value ASC NULLS LAST,
  s.product_id ASC
LIMIT :first;
```

## 8. Rule collection + product filters + price descending sort

Rule collection compiler должен перевести rules в bitmap inputs: scope
bitmaps, product facet bitmaps, vendor bitmaps и, если есть variant rules,
variant bitmaps before projection.

```sql
WITH rule_scope AS (
  SELECT (category_a.bitmap | category_b.bitmap) AS product_bitmap
  FROM catalog.listing_posting_bitmap category_a
  CROSS JOIN catalog.listing_posting_bitmap category_b
  WHERE category_a.project_id = :projectId
    AND category_a.entity_type = 'product'
    AND category_a.field = 'category'
    AND category_a.value_key = :categoryAId::text
    AND category_b.project_id = :projectId
    AND category_b.entity_type = 'product'
    AND category_b.field = 'category'
    AND category_b.value_key = :categoryBId::text
),
season_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :seasonWinterValueKey
),
brand_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :brandNikeValueKey
),
matches AS (
  SELECT (rule_scope.product_bitmap & season_filter.product_bitmap & brand_filter.product_bitmap) AS product_bitmap
  FROM rule_scope
  CROSS JOIN season_filter
  CROSS JOIN brand_filter
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.bigint_value AS max_price_minor
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'price_desc'
 AND s.locale = ''
 AND s.currency = :currency
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.bigint_value DESC NULLS LAST,
  s.product_id ASC
LIMIT :first;
```

Product scalar rules that are not represented by posting rows can either use a
dedicated physical posting field or build a temporary product bitmap from
`product_listing_index` with `rb_build_agg(product_doc_id)`. Do not
reintroduce raw handle arrays into listing read path.

## 9. Search candidates + structured filters + relevance sort

BM25 search is a separate candidate source. It returns product candidates for
one project/locale/query; listing engine intersects that candidate bitmap with
structured filters. Relevance sort remains dynamic and reads score from search
candidate relation.

```sql
WITH search_candidates AS (
  SELECT
    pli.product_doc_id,
    pli.product_id,
    pli.in_stock,
    pdb.score(ptsi.search_id) AS relevance_score
  FROM catalog.product_title_bm25_search_index ptsi
  JOIN catalog.product_listing_index pli
    ON pli.project_id = ptsi.project_id
   AND pli.product_id = ptsi.product_id
  WHERE ptsi.project_id = :projectId
    AND ptsi.locale = :locale
    AND ptsi.status = 'published'
    AND ptsi.title @@@ :query
    AND pli.status = 'published'
),
search_scope AS (
  SELECT rb_build_agg(product_doc_id) AS product_bitmap
  FROM search_candidates
),
brand_filter AS (
  SELECT p.bitmap AS product_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'product'
    AND p.field = 'facet'
    AND p.value_key = :brandNikeValueKey
),
color_filter AS (
  SELECT p.bitmap AS variant_bitmap
  FROM catalog.listing_posting_bitmap p
  WHERE p.project_id = :projectId
    AND p.entity_type = 'variant'
    AND p.field = 'facet'
    AND p.value_key = :colorBlackValueKey
),
in_stock_variants AS (
  SELECT rb_build_agg(vli.variant_doc_id) AS variant_bitmap
  FROM catalog.variant_listing_index vli
  WHERE vli.project_id = :projectId
    AND vli.in_stock = true
),
variant_matches AS (
  SELECT (color_filter.variant_bitmap & in_stock_variants.variant_bitmap)
    AS variant_bitmap
  FROM color_filter
  CROSS JOIN in_stock_variants
),
projected_color AS (
  SELECT project_variant_bitmap_to_products(variant_matches.variant_bitmap)
    AS product_bitmap
  FROM variant_matches
),
matches AS (
  SELECT (search_scope.product_bitmap & brand_filter.product_bitmap & projected_color.product_bitmap) AS product_bitmap
  FROM search_scope
  CROSS JOIN brand_filter
  CROSS JOIN projected_color
)
SELECT
  sc.product_doc_id,
  sc.product_id,
  sc.in_stock,
  sc.relevance_score
FROM search_candidates sc
CROSS JOIN matches m
WHERE m.product_bitmap @> sc.product_doc_id
ORDER BY
  sc.in_stock DESC,
  sc.relevance_score DESC,
  sc.product_id ASC
LIMIT :first;
```

Candidate relation must represent all BM25 matches for exact `totalCount` and
facet counts. Do not feed only top-K search hits into `search_scope` when
response includes totals or facets.

## 10. Cursor page ids without totalCount

Если client не запрашивает `totalCount`, page query читает `:firstPlusOne`
rows. `hasNextPage` определяется application layer по лишней строке. Bitmap
cardinality не вызывается.

```sql
WITH matches AS (
  SELECT :matchesBitmap::roaringbitmap AS product_bitmap
)
SELECT
  s.product_doc_id,
  s.product_id,
  s.bool_value AS in_stock,
  s.timestamptz_value AS published_at,
  s.timestamptz_value_2 AS product_created_at
FROM matches m
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.sort_kind = 'newest'
 AND s.locale = ''
 AND s.currency = ''
 AND s.manual_scope_id = :zeroManualScopeId
WHERE m.product_bitmap @> s.product_doc_id
  AND (
    :afterProductId IS NULL
    OR s.bool_value < :afterInStock
    OR (
      s.bool_value = :afterInStock
      AND s.timestamptz_value < :afterPublishedAt
    )
    OR (
      s.bool_value = :afterInStock
      AND s.timestamptz_value IS NOT DISTINCT FROM :afterPublishedAt
      AND s.timestamptz_value_2 < :afterProductCreatedAt
    )
    OR (
      s.bool_value = :afterInStock
      AND s.timestamptz_value IS NOT DISTINCT FROM :afterPublishedAt
      AND s.timestamptz_value_2 IS NOT DISTINCT FROM :afterProductCreatedAt
      AND s.product_id > :afterProductId
    )
  )
ORDER BY
  s.bool_value DESC,
  s.timestamptz_value DESC NULLS LAST,
  s.timestamptz_value_2 DESC NULLS LAST,
  s.product_id ASC
LIMIT :firstPlusOne;
```

Важно: seek predicate выше намеренно показывает только общий shape. Его нельзя
копировать в production для nullable sort keys. Production query builder должен
генерировать NULLS LAST aware predicate для каждого nullable key и покрывать
курсоры cases, где `published_at IS NULL` и/или fallback key is NULL.

## 11. Product facet counts as separate query

Facet counts считаются по product cardinality и full filtered scope, не по
текущей странице. Isolation rule: для counts конкретного `facet_id` исключаем
только active filters этого же `facet_id`, но сохраняем остальные filters.

Пример считает два product-level facets: brand и material.

```sql
WITH base_scope AS (
  SELECT :baseScopeBitmap::roaringbitmap AS product_bitmap
),
brand_filter AS (
  SELECT :brandFilterBitmap::roaringbitmap AS product_bitmap
),
material_filter AS (
  SELECT :materialFilterBitmap::roaringbitmap AS product_bitmap
),
brand_isolated AS (
  SELECT (base_scope.product_bitmap & material_filter.product_bitmap)
    AS product_bitmap
  FROM base_scope
  CROSS JOIN material_filter
),
material_isolated AS (
  SELECT (base_scope.product_bitmap & brand_filter.product_bitmap)
    AS product_bitmap
  FROM base_scope
  CROSS JOIN brand_filter
),
brand_values(value_key) AS (
  VALUES
    (:brandNikeValueKey),
    (:brandAdidasValueKey)
),
material_values(value_key) AS (
  VALUES
    (:materialLeatherValueKey),
    (:materialCottonValueKey)
),
brand_counts AS (
  SELECT
    p.value_key,
    rb_cardinality(
      (brand_isolated.product_bitmap & p.bitmap)
    ) AS product_count
  FROM brand_isolated
  JOIN brand_values bv ON true
  JOIN catalog.listing_posting_bitmap p
    ON p.project_id = :projectId
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND p.value_key = bv.value_key
),
material_counts AS (
  SELECT
    p.value_key,
    rb_cardinality(
      (material_isolated.product_bitmap & p.bitmap)
    ) AS product_count
  FROM material_isolated
  JOIN material_values mv ON true
  JOIN catalog.listing_posting_bitmap p
    ON p.project_id = :projectId
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND p.value_key = mv.value_key
)
SELECT
  (SELECT jsonb_agg(to_jsonb(brand_counts.*)) FROM brand_counts)
    AS brand_counts,
  (SELECT jsonb_agg(to_jsonb(material_counts.*)) FROM material_counts)
    AS material_counts;
```

Aggregation repository должен ограничивать `*_values` configured storefront
facet values. Не нужно сканировать все posting rows с `field = 'facet'`.

## 12. Full listing page: page ids + totalCount + isolated facet counts

Тяжелая форма объединяет page, totalCount и counts. Для production допускается
разделить ее на несколько SQL statements, если planner хуже оптимизирует
monolithic CTE.

```sql
WITH base_scope AS (
  SELECT :baseScopeBitmap::roaringbitmap AS product_bitmap
),
brand_filter AS (
  SELECT :brandFilterBitmap::roaringbitmap AS product_bitmap
),
material_filter AS (
  SELECT :materialFilterBitmap::roaringbitmap AS product_bitmap
),
matches AS (
  SELECT (base_scope.product_bitmap & brand_filter.product_bitmap & material_filter.product_bitmap) AS product_bitmap
  FROM base_scope
  CROSS JOIN brand_filter
  CROSS JOIN material_filter
),
page_products AS (
  SELECT
    s.product_doc_id,
    s.product_id,
    s.bool_value AS in_stock,
    s.timestamptz_value AS product_created_at
  FROM matches m
  JOIN catalog.listing_posting_product_sort s
    ON s.project_id = :projectId
   AND s.sort_kind = 'created'
   AND s.locale = ''
   AND s.currency = ''
   AND s.manual_scope_id = :zeroManualScopeId
  WHERE m.product_bitmap @> s.product_doc_id
  ORDER BY
    s.bool_value DESC,
    s.timestamptz_value DESC,
    s.product_id ASC
  LIMIT :first
),
total_count AS (
  SELECT rb_cardinality(product_bitmap) AS total_count
  FROM matches
),
brand_isolated AS (
  SELECT (base_scope.product_bitmap & material_filter.product_bitmap)
    AS product_bitmap
  FROM base_scope
  CROSS JOIN material_filter
),
material_isolated AS (
  SELECT (base_scope.product_bitmap & brand_filter.product_bitmap)
    AS product_bitmap
  FROM base_scope
  CROSS JOIN brand_filter
),
brand_counts AS (
  SELECT
    p.value_key,
    rb_cardinality(
      (brand_isolated.product_bitmap & p.bitmap)
    ) AS product_count
  FROM brand_isolated
  JOIN catalog.listing_posting_bitmap p
    ON p.project_id = :projectId
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND p.value_key = ANY(:brandValueKeys)
),
material_counts AS (
  SELECT
    p.value_key,
    rb_cardinality(
      (material_isolated.product_bitmap & p.bitmap)
    ) AS product_count
  FROM material_isolated
  JOIN catalog.listing_posting_bitmap p
    ON p.project_id = :projectId
   AND p.entity_type = 'product'
   AND p.field = 'facet'
   AND p.value_key = ANY(:materialValueKeys)
)
SELECT
  (SELECT jsonb_agg(to_jsonb(page_products.*)) FROM page_products)
    AS page_products,
  (SELECT total_count FROM total_count)
    AS total_count,
  (SELECT jsonb_agg(to_jsonb(brand_counts.*)) FROM brand_counts)
    AS brand_counts,
  (SELECT jsonb_agg(to_jsonb(material_counts.*)) FROM material_counts)
    AS material_counts;
```

## 13. Full listing + option isolation + price range + matched price sort

Самый тяжелый storefront shape:

- есть product-level filters;
- есть несколько option filters;
- есть price range;
- option и price должны совпасть на одном in-stock variant;
- sort идет по matched variant price;
- totalCount считается по product bitmap;
- option counts требуют variant-level isolation и projection в product bitmap.

`page_products` ниже повторяет correctness/reference anti-join shape из раздела
6. Production collector может заменить этот CTE на ordered chunk scan +
application dedupe, сохранив те же `variant_matches`, `product_matches`, order
keys и cursor semantics.

```sql
WITH base_scope AS (
  SELECT :baseScopeBitmap::roaringbitmap AS product_bitmap
),
brand_filter AS (
  SELECT :brandFilterBitmap::roaringbitmap AS product_bitmap
),
color_filter AS (
  SELECT :colorFilterBitmap::roaringbitmap AS variant_bitmap
),
size_filter AS (
  SELECT :sizeFilterBitmap::roaringbitmap AS variant_bitmap
),
price_filter AS (
  SELECT rb_build_agg(vp.variant_doc_id) AS variant_bitmap
  FROM catalog.listing_posting_variant_price vp
  WHERE vp.project_id = :projectId
    AND vp.currency = :currency
    AND vp.price_minor >= :minPriceMinor
    AND vp.price_minor <= :maxPriceMinor
),
variant_matches AS (
  SELECT (color_filter.variant_bitmap & size_filter.variant_bitmap & price_filter.variant_bitmap) AS variant_bitmap
  FROM color_filter
  CROSS JOIN size_filter
  CROSS JOIN price_filter
),
projected_variant_matches AS (
  SELECT project_variant_bitmap_to_products(variant_matches.variant_bitmap)
    AS product_bitmap
  FROM variant_matches
),
product_filter_base AS (
  SELECT (base_scope.product_bitmap & brand_filter.product_bitmap)
    AS product_bitmap
  FROM base_scope
  CROSS JOIN brand_filter
),
product_matches AS (
  SELECT (product_filter_base.product_bitmap & projected_variant_matches.product_bitmap) AS product_bitmap
  FROM product_filter_base
  CROSS JOIN projected_variant_matches
),
page_products AS (
  SELECT
    vp.product_doc_id,
    vp.product_id,
    vp.variant_doc_id,
    vp.price_minor
  FROM variant_matches vm
  CROSS JOIN product_matches pm
  JOIN catalog.listing_posting_variant_price vp
    ON vp.project_id = :projectId
   AND vp.currency = :currency
  WHERE vm.variant_bitmap @> vp.variant_doc_id
    AND pm.product_bitmap @> vp.product_doc_id
    AND NOT EXISTS (
      SELECT 1
      FROM catalog.listing_posting_variant_price earlier
      WHERE earlier.project_id = :projectId
        AND earlier.currency = :currency
        AND earlier.product_id = vp.product_id
        AND vm.variant_bitmap @> earlier.variant_doc_id
        AND pm.product_bitmap @> earlier.product_doc_id
        AND (
          earlier.price_minor < vp.price_minor
          OR (
            earlier.price_minor = vp.price_minor
            AND earlier.variant_doc_id < vp.variant_doc_id
          )
        )
    )
  ORDER BY
    vp.price_minor ASC,
    vp.product_id ASC,
    vp.variant_doc_id ASC
  LIMIT :first
),
total_count AS (
  SELECT rb_cardinality(product_bitmap) AS total_count
  FROM product_matches
),
color_isolated_variants AS (
  SELECT (size_filter.variant_bitmap & price_filter.variant_bitmap)
    AS variant_bitmap
  FROM size_filter
  CROSS JOIN price_filter
),
color_counts AS (
  SELECT
    p.value_key,
    rb_cardinality(
      (product_filter_base.product_bitmap & project_variant_bitmap_to_products(
          (color_isolated_variants.variant_bitmap & p.bitmap)
        )
      )
    ) AS product_count
  FROM product_filter_base
  CROSS JOIN color_isolated_variants
  JOIN catalog.listing_posting_bitmap p
    ON p.project_id = :projectId
   AND p.entity_type = 'variant'
   AND p.field = 'facet'
   AND p.value_key = ANY(:colorValueKeys)
)
SELECT
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product_doc_id', pp.product_doc_id,
        'product_id', pp.product_id,
        'matched_variant_doc_id', pp.variant_doc_id,
        'matched_min_price_minor', pp.price_minor
      )
      ORDER BY pp.price_minor ASC, pp.product_id ASC, pp.variant_doc_id ASC
    )
    FROM page_products pp
  )
    AS page_products,
  (SELECT total_count FROM total_count)
    AS total_count,
  (SELECT jsonb_agg(to_jsonb(color_counts.*)) FROM color_counts)
    AS color_counts;
```

Important nuance for option counts: `color_counts` excludes active color
filter, but keeps size and price. If product-level filters exist, intersect
the projected option value products with the product-level base that includes
those product filters.

## Практические правила выбора query shape

- Для category/collection/global scope сначала получить product bitmap.
- Для product-level facets использовать product posting rows:
  `entity_type = 'product'`, `field = 'facet'`.
- Для vendor использовать explicit product posting row:
  `entity_type = 'product'`, `field = 'vendor'`.
- Для option facets использовать variant posting rows:
  `entity_type = 'variant'`, `field = 'facet'`.
- OR внутри одного facet выполняется до AND с другими filters.
- AND между option facets выполняется на `variant_doc_id` до projection, чтобы
  сохранить same-variant semantics.
- Price range строится из `listing_posting_variant_price`; generic
  `field = 'price'` posting row не создается.
- Если активны option или price predicates и sort идет по price, использовать
  matched variant price collector. Preferred hot path для high-duplication
  products - ordered chunk scan по `listing_posting_variant_price` с application
  dedupe; SQL anti-join использовать как correctness/reference или fallback
  shape.
- Для `newest`, `created`, `name`, `manual` и product aggregate price sort
  использовать `listing_posting_product_sort`.
- Если client не запрашивает `totalCount`, page query не должен вызывать
  `rb_cardinality` для полного matches bitmap.
- Facet counts считать отдельным SQL statement, когда это помогает planner-у.
- Counts всегда считаются по full filtered scope и product cardinality, а не
  по page ids.
- Broad variant projection должна идти через projection blocks; не разворачивать
  все matching variants через `rb_iterate` на hot path.
- Missing posting row для одного selected value означает empty bitmap только
  для этого value. Query builder может short-circuit request до page collector,
  когда required OR-группа целиком empty.
