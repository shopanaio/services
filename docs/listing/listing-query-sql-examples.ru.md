# SQL-примеры listing query для фильтрации и сортировки

Документ дополняет `docs/listing/listing-index-redesign-plan.ru.md` и
`docs/listing/listing-index-db-schema.ru.md`. Цель - зафиксировать типовые SQL
формы storefront listing query, где пользователь одновременно фильтрует и
сортирует продукты. Примеры расположены по ожидаемой стоимости выполнения: от
самых быстрых access path к самым тяжелым query shapes.

Все примеры предполагают:

- `:projectId` - текущий project boundary;
- `:currency` - default storefront currency проекта;
- `:locale` - storefront locale;
- `:first` - page size;
- cursor pagination добавляется keyset predicates по тем же sort keys;
- `base_scope` всегда оставляет только `pli.status = 'published'`;
- каждая сортировка начинается с `in_stock DESC` и завершается
  `product_id ASC`;
- product-level filters идут через `product_listing_facet_token`;
- option/price filters идут через один и тот же in-stock variant row.

## 1. Category scope + vendor filter + newest sort

Самый дешевый storefront path: category scope уже дает ограниченный набор
product ids, vendor является обычным product-level predicate, sort покрывается
`idx_product_listing_visible_newest`.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    pli.published_at,
    pli.product_created_at
  FROM catalog.product_category pc
  JOIN catalog.product_listing_index pli
    ON pli.project_id = pc.project_id
   AND pli.product_id = pc.product_id
  WHERE pc.project_id = :projectId
    AND pc.category_id = :categoryId
    AND pli.project_id = :projectId
    AND pli.status = 'published'
    AND pli.vendor_id = :vendorId
)
SELECT product_id, in_stock, published_at, product_created_at
FROM base_scope
ORDER BY
  in_stock DESC,
  published_at DESC NULLS LAST,
  product_created_at DESC,
  product_id ASC
LIMIT :first;
```

## 2. Manual collection + product facet filter + manual sort

Manual collection сохраняет порядок `collection_item.lexo_rank`. Фильтр по
одному product-level facet использует token index и не требует variant joins.

```sql
WITH base_scope AS (
  SELECT
    ci.product_id,
    ci.lexo_rank AS manual_rank,
    pli.in_stock
  FROM catalog.collection_item ci
  JOIN catalog.product_listing_index pli
    ON pli.project_id = ci.project_id
   AND pli.product_id = ci.product_id
  WHERE ci.project_id = :projectId
    AND ci.collection_id = :collectionId
    AND pli.status = 'published'
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :tagFacetId
      AND pft.facet_value_id = ANY(:tagValueIds)
  )
)
SELECT product_id, in_stock, manual_rank
FROM filtered_products
ORDER BY
  in_stock DESC,
  manual_rank ASC,
  product_id ASC
LIMIT :first;
```

## 3. Global listing + several product facets + created sort

OR внутри одного facet задается `ANY(:valueIds)`, AND между разными facets -
разными `EXISTS`. Это дешевле, чем join с группировкой, когда active product
facets немного.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    pli.product_created_at
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
    AND pli.in_stock = true
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
    AND EXISTS (
      SELECT 1
      FROM catalog.product_listing_facet_token pft
      WHERE pft.project_id = :projectId
        AND pft.product_id = bs.product_id
        AND pft.facet_id = :materialFacetId
        AND pft.facet_value_id = ANY(:materialValueIds)
    )
)
SELECT product_id, in_stock, product_created_at
FROM filtered_products
ORDER BY
  in_stock DESC,
  product_created_at DESC,
  product_id ASC
LIMIT :first;
```

## 4. Category scope + option filters + newest sort

Option filters должны применяться к одному in-stock variant. Для нескольких
option facets используются отдельные `EXISTS` predicates, привязанные к одному
`vli.variant_id`. Это сохраняет same-variant semantics без `GROUP BY` и
`COUNT(DISTINCT ...)`.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    pli.published_at,
    pli.product_created_at
  FROM catalog.product_category pc
  JOIN catalog.product_listing_index pli
    ON pli.project_id = pc.project_id
   AND pli.product_id = pc.product_id
  WHERE pc.project_id = :projectId
    AND pc.category_id = :categoryId
    AND pli.status = 'published'
),
matching_variants AS (
  SELECT vli.product_id, vli.variant_id
  FROM catalog.variant_listing_index vli
  JOIN base_scope bs
    ON bs.product_id = vli.product_id
  WHERE vli.project_id = :projectId
    AND vli.in_stock = true
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token color_filter
      WHERE color_filter.project_id = vli.project_id
        AND color_filter.variant_id = vli.variant_id
        AND color_filter.facet_id = :colorFacetId
        AND color_filter.facet_value_id = ANY(:colorValueIds)
    )
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token size_filter
      WHERE size_filter.project_id = vli.project_id
        AND size_filter.variant_id = vli.variant_id
        AND size_filter.facet_id = :sizeFacetId
        AND size_filter.facet_value_id = ANY(:sizeValueIds)
    )
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM matching_variants mv
    WHERE mv.product_id = bs.product_id
  )
)
SELECT product_id, in_stock, published_at, product_created_at
FROM filtered_products
ORDER BY
  in_stock DESC,
  published_at DESC NULLS LAST,
  product_created_at DESC,
  product_id ASC
LIMIT :first;
```

## 5. Product filters + aggregate price filter + price ascending sort

Когда active variant filters отсутствуют, price sort может использовать
product-level price aggregate. Это быстрее, чем matched variant aggregation.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    plpi.min_price_minor
  FROM catalog.product_listing_index pli
  JOIN catalog.product_listing_price_index plpi
    ON plpi.project_id = pli.project_id
   AND plpi.product_id = pli.product_id
   AND plpi.currency = :currency
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
    AND plpi.has_price = true
    AND plpi.min_price_minor BETWEEN :minPriceMinor AND :maxPriceMinor
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
)
SELECT product_id, in_stock, min_price_minor
FROM filtered_products
ORDER BY
  in_stock DESC,
  min_price_minor ASC NULLS LAST,
  product_id ASC
LIMIT :first;
```

## 6. Option filters + price filter + matched price ascending sort

Этот query тяжелее, потому что price predicate и option predicates должны
сойтись на одном in-stock variant. Sort key берется как минимальная цена среди
matching variants, а не из product aggregate.

```sql
WITH base_scope AS (
  SELECT pli.product_id, pli.in_stock
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
),
matching_variants AS (
  SELECT
    vli.product_id,
    vli.variant_id,
    vlpi.price_minor
  FROM catalog.variant_listing_index vli
  JOIN catalog.variant_listing_price_index vlpi
    ON vlpi.project_id = vli.project_id
   AND vlpi.variant_id = vli.variant_id
   AND vlpi.currency = :currency
   AND vlpi.has_price = true
  JOIN base_scope bs
    ON bs.product_id = vli.product_id
  WHERE vli.project_id = :projectId
    AND vli.in_stock = true
    AND vlpi.price_minor BETWEEN :minPriceMinor AND :maxPriceMinor
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token color_filter
      WHERE color_filter.project_id = vli.project_id
        AND color_filter.variant_id = vli.variant_id
        AND color_filter.facet_id = :colorFacetId
        AND color_filter.facet_value_id = ANY(:colorValueIds)
    )
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token size_filter
      WHERE size_filter.project_id = vli.project_id
        AND size_filter.variant_id = vli.variant_id
        AND size_filter.facet_id = :sizeFacetId
        AND size_filter.facet_value_id = ANY(:sizeValueIds)
    )
),
matched_products AS (
  SELECT
    bs.product_id,
    bs.in_stock,
    MIN(mv.price_minor) AS matched_min_price_minor
  FROM base_scope bs
  JOIN matching_variants mv
    ON mv.product_id = bs.product_id
  GROUP BY bs.product_id, bs.in_stock
)
SELECT product_id, in_stock, matched_min_price_minor
FROM matched_products
ORDER BY
  in_stock DESC,
  matched_min_price_minor ASC NULLS LAST,
  product_id ASC
LIMIT :first;
```

## 7. Name sort + product and option filters

Locale-dependent name sort требует join к `product_translation`. Он дороже, чем
sort по полям listing index, особенно при широком scope.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
),
product_filtered AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
),
variant_filtered AS (
  SELECT pf.*
  FROM product_filtered pf
  WHERE EXISTS (
    SELECT 1
    FROM catalog.variant_listing_index vli
    JOIN catalog.variant_listing_facet_token vft
      ON vft.project_id = vli.project_id
     AND vft.variant_id = vli.variant_id
    WHERE vli.project_id = :projectId
      AND vli.product_id = pf.product_id
      AND vli.in_stock = true
      AND vft.facet_id = :colorFacetId
      AND vft.facet_value_id = ANY(:colorValueIds)
  )
)
SELECT
  vf.product_id,
  vf.in_stock,
  pt.name
FROM variant_filtered vf
JOIN catalog.product_translation pt
  ON pt.project_id = :projectId
 AND pt.product_id = vf.product_id
 AND pt.locale = :locale
ORDER BY
  vf.in_stock DESC,
  pt.name ASC,
  vf.product_id ASC
LIMIT :first;
```

## 8. Rule collection + product filters + price descending sort

Rule collection обычно компилируется в несколько product-level predicates.
Если нет active option filters, price descending использует
`product_listing_price_index.max_price_minor`.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    plpi.max_price_minor
  FROM catalog.product_listing_index pli
  JOIN catalog.product_listing_price_index plpi
    ON plpi.project_id = pli.project_id
   AND plpi.product_id = pli.product_id
   AND plpi.currency = :currency
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
    AND pli.kind = ANY(:allowedKinds)
    AND pli.category_handles && :categoryHandles
    AND plpi.has_price = true
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :seasonFacetId
      AND pft.facet_value_id = ANY(:seasonValueIds)
  )
    AND EXISTS (
      SELECT 1
      FROM catalog.product_listing_facet_token pft
      WHERE pft.project_id = :projectId
        AND pft.product_id = bs.product_id
        AND pft.facet_id = :brandFacetId
        AND pft.facet_value_id = ANY(:brandValueIds)
    )
)
SELECT product_id, in_stock, max_price_minor
FROM filtered_products
ORDER BY
  in_stock DESC,
  max_price_minor DESC NULLS LAST,
  product_id ASC
LIMIT :first;
```

## 9. Search candidates + structured filters + relevance sort

Текстовый search index возвращает candidate set и score. Listing query после
этого применяет visibility, structured filters и availability-first relevance
sort. Это тяжелее обычного listing из-за materialized candidate relation, но
дешевле полного facet/count query.

```sql
WITH search_candidates AS (
  SELECT
    ptsi.product_id,
    pdb.score(ptsi.search_id) AS relevance_score
  FROM catalog.product_title_bm25_search_index ptsi
  WHERE ptsi.project_id = :projectId
    AND ptsi.locale = :locale
    AND ptsi.status = 'published'
    AND ptsi.title @@@ :query
),
base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    sc.relevance_score
  FROM search_candidates sc
  JOIN catalog.product_listing_index pli
    ON pli.project_id = :projectId
   AND pli.product_id = sc.product_id
  WHERE pli.status = 'published'
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_index vli
      JOIN catalog.variant_listing_facet_token vft
        ON vft.project_id = vli.project_id
       AND vft.variant_id = vli.variant_id
      WHERE vli.project_id = :projectId
        AND vli.product_id = bs.product_id
        AND vli.in_stock = true
        AND vft.facet_id = :colorFacetId
        AND vft.facet_value_id = ANY(:colorValueIds)
    )
)
SELECT product_id, in_stock, relevance_score
FROM filtered_products
ORDER BY
  in_stock DESC,
  relevance_score DESC,
  product_id ASC
LIMIT :first;
```

## 10. Full listing page: page ids + totalCount + isolated facet counts

Самая тяжелая форма: один request возвращает страницу товаров, totalCount и
facet counts с isolation. Counts считаются по полному filtered scope, не по
странице. Для каждого facet count нужно исключить только фильтр своего
`facet_id`, но оставить остальные active filters.

Пример ниже показывает product-level facet counts. Option counts должны идти
от `variant_listing_index` + `variant_listing_facet_token`, дедуплицируясь до
`(product_id, facet_id, facet_value_id)`.

```sql
WITH base_scope AS (
  SELECT
    pli.product_id,
    pli.in_stock,
    pli.product_created_at
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
),
brand_isolated_scope AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :materialFacetId
      AND pft.facet_value_id = ANY(:materialValueIds)
  )
),
material_isolated_scope AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
),
filtered_products AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
    AND EXISTS (
      SELECT 1
      FROM catalog.product_listing_facet_token pft
      WHERE pft.project_id = :projectId
        AND pft.product_id = bs.product_id
        AND pft.facet_id = :materialFacetId
        AND pft.facet_value_id = ANY(:materialValueIds)
    )
),
page_products AS (
  SELECT product_id, in_stock, product_created_at
  FROM filtered_products
  ORDER BY
    in_stock DESC,
    product_created_at DESC,
    product_id ASC
  LIMIT :first
),
total_count AS (
  SELECT COUNT(*) AS total_count
  FROM filtered_products
),
brand_counts AS (
  SELECT
    pft.facet_id,
    pft.facet_value_id,
    COUNT(*) AS product_count
  FROM brand_isolated_scope bis
  JOIN catalog.product_listing_facet_token pft
    ON pft.project_id = :projectId
   AND pft.product_id = bis.product_id
   AND pft.facet_id = :brandFacetId
  GROUP BY pft.facet_id, pft.facet_value_id
),
material_counts AS (
  SELECT
    pft.facet_id,
    pft.facet_value_id,
    COUNT(*) AS product_count
  FROM material_isolated_scope mis
  JOIN catalog.product_listing_facet_token pft
    ON pft.project_id = :projectId
   AND pft.product_id = mis.product_id
   AND pft.facet_id = :materialFacetId
  GROUP BY pft.facet_id, pft.facet_value_id
)
SELECT
  jsonb_agg(to_jsonb(page_products.*)) AS page_products,
  (SELECT total_count FROM total_count) AS total_count,
  (
    SELECT jsonb_agg(to_jsonb(brand_counts.*))
    FROM brand_counts
  ) AS brand_counts,
  (
    SELECT jsonb_agg(to_jsonb(material_counts.*))
    FROM material_counts
  ) AS material_counts
FROM page_products;
```

## 11. Full listing page + option isolation + price range + matched price sort

Это самый тяжелый storefront shape в рамках listing index:

- есть product-level filters;
- есть несколько option filters;
- есть price range;
- option и price должны совпасть на одном in-stock variant;
- сортировка идет по matched variant price;
- totalCount и option counts считаются по full scope, а не по page ids;
- option counts требуют variant-level isolation и дедупликации product ids.

```sql
WITH base_scope AS (
  SELECT pli.product_id, pli.in_stock
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.status = 'published'
),
product_filtered AS (
  SELECT bs.*
  FROM base_scope bs
  WHERE EXISTS (
    SELECT 1
    FROM catalog.product_listing_facet_token pft
    WHERE pft.project_id = :projectId
      AND pft.product_id = bs.product_id
      AND pft.facet_id = :brandFacetId
      AND pft.facet_value_id = ANY(:brandValueIds)
  )
),
matching_variants AS (
  SELECT
    vli.product_id,
    vli.variant_id,
    vlpi.price_minor
  FROM product_filtered pf
  JOIN catalog.variant_listing_index vli
    ON vli.project_id = :projectId
   AND vli.product_id = pf.product_id
   AND vli.in_stock = true
  JOIN catalog.variant_listing_price_index vlpi
    ON vlpi.project_id = vli.project_id
   AND vlpi.variant_id = vli.variant_id
   AND vlpi.currency = :currency
   AND vlpi.has_price = true
   AND vlpi.price_minor BETWEEN :minPriceMinor AND :maxPriceMinor
  WHERE EXISTS (
    SELECT 1
    FROM catalog.variant_listing_facet_token color_filter
    WHERE color_filter.project_id = vli.project_id
      AND color_filter.variant_id = vli.variant_id
      AND color_filter.facet_id = :colorFacetId
      AND color_filter.facet_value_id = ANY(:colorValueIds)
  )
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token size_filter
      WHERE size_filter.project_id = vli.project_id
        AND size_filter.variant_id = vli.variant_id
        AND size_filter.facet_id = :sizeFacetId
        AND size_filter.facet_value_id = ANY(:sizeValueIds)
    )
),
filtered_products AS (
  SELECT
    pf.product_id,
    pf.in_stock,
    MIN(mv.price_minor) AS matched_min_price_minor
  FROM product_filtered pf
  JOIN matching_variants mv
    ON mv.product_id = pf.product_id
  GROUP BY pf.product_id, pf.in_stock
),
page_products AS (
  SELECT product_id, in_stock, matched_min_price_minor
  FROM filtered_products
  ORDER BY
    in_stock DESC,
    matched_min_price_minor ASC NULLS LAST,
    product_id ASC
  LIMIT :first
),
total_count AS (
  SELECT COUNT(*) AS total_count
  FROM filtered_products
),
color_isolated_variants AS (
  SELECT DISTINCT
    vli.product_id,
    vft.facet_id,
    vft.facet_value_id
  FROM product_filtered pf
  JOIN catalog.variant_listing_index vli
    ON vli.project_id = :projectId
   AND vli.product_id = pf.product_id
   AND vli.in_stock = true
  JOIN catalog.variant_listing_price_index vlpi
    ON vlpi.project_id = vli.project_id
   AND vlpi.variant_id = vli.variant_id
   AND vlpi.currency = :currency
   AND vlpi.has_price = true
   AND vlpi.price_minor BETWEEN :minPriceMinor AND :maxPriceMinor
  JOIN catalog.variant_listing_facet_token size_filter
    ON size_filter.project_id = vli.project_id
   AND size_filter.variant_id = vli.variant_id
   AND size_filter.facet_id = :sizeFacetId
   AND size_filter.facet_value_id = ANY(:sizeValueIds)
  JOIN catalog.variant_listing_facet_token vft
    ON vft.project_id = vli.project_id
   AND vft.variant_id = vli.variant_id
   AND vft.facet_id = :colorFacetId
),
color_counts AS (
  SELECT facet_id, facet_value_id, COUNT(*) AS product_count
  FROM color_isolated_variants
  GROUP BY facet_id, facet_value_id
)
SELECT
  jsonb_agg(to_jsonb(page_products.*)) AS page_products,
  (SELECT total_count FROM total_count) AS total_count,
  (
    SELECT jsonb_agg(to_jsonb(color_counts.*))
    FROM color_counts
  ) AS color_counts
FROM page_products;
```

## Практические правила выбора query shape

- Для `newest` и `created` сначала пытаться читать из
  `product_listing_index` без price/translation joins.
- Для `manual` sort сначала ограничивать scope через `product_category` или
  `collection_item`, затем применять filters.
- Для `price` sort без active option filters использовать
  `product_listing_price_index`.
- Для `price` sort с active option filters использовать
  `variant_listing_index` + `variant_listing_price_index` и агрегировать
  matched price per product.
- Для product-level facets предпочитать несколько `EXISTS`, пока количество
  active facets мало; grouped token query нужен при большом динамическом наборе
  filters.
- Для option facets всегда сохранять same-variant semantics через `variant_id`;
  при небольшом числе active option facets предпочитать отдельные `EXISTS`
  predicates вместо `OR` + `GROUP BY` + `HAVING COUNT(DISTINCT ...)`.
- Для full PLP response разделять page query, total count и facet counts на CTE
  или отдельные SQL statements, если `EXPLAIN ANALYZE` покажет, что PostgreSQL
  хуже планирует большой monolithic CTE.
