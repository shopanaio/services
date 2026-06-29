# План переработки listing index для listing, facets, filtering и sort

## Контекст

Текущие `catalog.product_search_index` и `catalog.variant_search_index` являются не full-text search index, а read model для listing/facets. Название и часть состава таблиц уже вводят путаницу: они обслуживают structured filtering, facet counts и sort, а не текстовый поиск.

Обратная совместимость не требуется. Можно удалять старые таблицы, модели, репозитории и скрипты без dual-write, compatibility views и миграции старых данных. После изменения индексы пересобираются полным rebuild.

## Storefront операции, которые должен поддерживать listing index

Listing index обслуживает только операции витрины, связанные с выдачей товаров,
structured filtering, facets, counts, pagination и sort. Backend sync/rebuild
операции описаны отдельно в lifecycle section и не являются storefront
операциями.

### Entry points выдачи

- Category PLP: открыть страницу категории и получить товары, total, facets,
  counts, pageInfo и sort options в рамках category navigation scope.
- Manual collection PLP: открыть ручную подборку и сохранить порядок
  `collection_item.lexo_rank`.
- Rule collection PLP: открыть динамическую подборку, где collection rules
  компилируются в product-level и variant-level predicates.
- Global catalog listing: открыть общий каталог проекта без category или
  collection scope, но с теми же visibility, filters, facets, counts,
  pagination и sort.
- Search results listing: применить structured listing pipeline к candidate set
  текстового поиска. Текстовый search index возвращает candidate product ids и
  relevance score, а listing index применяет visibility, filters, facets,
  counts, pagination и business sort.

### Scope и visibility

- Применить `project_id` isolation ко всем storefront queries.
- Применить request currency для price filter, price range и price sort, если
  storefront contract разрешает multi-currency выдачу.
- Применить locale для locale-dependent sort и последующей hydration карточек.
- Показывать только published products; soft-deleted products не должны
  присутствовать в index.
- Использовать category только как navigation scope и rule field, не как
  storefront facet.

### Product-level filtering

- Фильтровать по configured tag facet values.
- Фильтровать по configured feature facet values.
- Фильтровать по `vendor_id` как явный storefront filter.
- Фильтровать rule collections по `category_handles`, `tag_handles`,
  `feature_value_handles`, product kind, dates and visibility fields where
  supported by rule compiler.
- Поддерживать OR внутри одного product-level `facet_id`.
- Поддерживать AND между разными product-level `facet_id`.
- Игнорировать invalid или unconfigured facet values, которые не резолвятся в
  enabled `facet_value` + `facet_value_source_handle`.

### Variant-level filtering

- Фильтровать по option facets так, чтобы все active option predicates
  применялись к одному и тому же in-stock variant row.
- Фильтровать по price range через `has_price = true` и `price_minor` в request
  currency только среди variants в наличии.
- Фильтровать по `in_stock` как availability toggle на product aggregate; сами
  variant-level filters уже ограничены in-stock variant rows.
- Комбинировать active `OPTION` и `PRICE` predicates в одном in-stock variant
  predicate group. Нельзя удовлетворять `color:red` одним variant, а `size:xl`
  или price другим variant того же product.
- Storefront variant matching всегда строится от in-stock variants. Если variant
  не в наличии, он не должен удовлетворять option filters, price filters,
  matched variant sort, option counts или variant-level collection rules.
- Поддерживать OR внутри одного option `facet_id` и AND между разными option
  `facet_id`.

### Facet resolution и value visibility

- Batch-resolve storefront tokens `facetSlug:valueSlug` через `facet`,
  `facet_value` и `facet_value_source_handle`.
- Возвращать на storefront только configured facets и enabled `facet_value`
  rows.
- Не возвращать raw tag/feature/option source handles наружу.
- Поддерживать merged values: один `facet_value` может мапиться на несколько
  source handles.
- Не показывать values без enabled `facet_value` и без source mapping.

### Facet aggregation

- Считать facet counts по full listing scope, а не по текущей странице товаров.
- Считать product-level facet counts для tag и feature.
- Считать option facet counts variant-correct только по in-stock variants и
  возвращать `COUNT(DISTINCT product_id)`, а не count variants.
- Поддерживать facet isolation: count для value считается со всеми активными
  filters, кроме filter своего `facet_id`.
- Делать isolation именно по `facet_id`, не по `facet_type`, чтобы два feature
  facets не влияли друг на друга как один общий type.
- Группировать counts merged values по `facet_value_id` и не double-count
  product, если несколько source handles одного product ведут к одному
  `facet_value`.
- Считать price range virtual facet: min/max price по in-stock variants с
  применением всех active filters, кроме active price predicate.
- Считать in-stock virtual facet: count products с in-stock variant с
  применением всех active filters, кроме active in-stock predicate.
- Считать total count со всеми active filters без isolation.

### Sorting

- Все storefront sorts должны сначала показывать товары в наличии, а товары не
  в наличии отправлять в конец списка. Availability bucket применяется перед
  выбранной пользователем сортировкой: `in_stock DESC`, затем requested sort
  keys, затем `product_id ASC`.
- Поддерживать manual sort для category/manual collection через `manual_rank`.
- Поддерживать newest sort по `published_at DESC NULLS LAST`,
  `product_created_at DESC`, `product_id ASC`.
- Поддерживать created sort по `product_created_at DESC`, `product_id ASC`.
- Поддерживать name sort через locale-specific `product_translation` join.
- Поддерживать price ascending: lowest in-stock product aggregate price when no
  active variant filters exist, otherwise lowest matching in-stock variant
  price.
- Поддерживать price descending: highest in-stock product aggregate or highest
  matching in-stock variant price according to explicit product requirement.
- Поддерживать relevance sort for search results через score из search candidate
  set, with `product_id ASC` tie-breaker.
- Все sorts должны быть deterministic и завершаться stable tie-breaker
  `product_id ASC`.

### Pagination и result shape

- Поддерживать cursor pagination для всех storefront sorts.
- Cursor должен включать значения sort keys, `product_id` tie-breaker и filter
  hash, чтобы invalid cursor при изменении filters не применялся к другой
  выдаче.
- Возвращать `edges`, `pageInfo`, `totalCount`, facets and applied filters
  metadata without loading all candidate products into memory.
- Listing index возвращает ordered product ids and listing aggregates.
  Hydration карточек товара должна выполняться отдельным batch pipeline без
  N+1: title, handle, media, display price, badges, swatches and availability
  labels.

## Цели

1. Сделать read model, которая явно обслуживает Product Listing Page: scope, filters, facets, counts, total, pagination и sort.
2. Сохранить variant-correct semantics для `OPTION` и `PRICE`: все
   variant-level predicates должны применяться к одному и тому же in-stock
   variant row. `IN_STOCK` остается storefront availability toggle поверх
   product aggregate.
3. Считать facet counts в PostgreSQL, а не циклами в TypeScript.
4. Поддержать facet isolation: count для значения считается со всеми активными фильтрами, кроме фильтра своего facet id.
5. Оставить array + GIN модель для source handles до реальной просадки. Нормализованные inverted-index таблицы не вводить сейчас.

## Не цели

- Не строить full-text search. Название, description и SEO translations остаются вне listing index.
- Не делать совместимость со старыми `product_search_index` / `variant_search_index`.
- Не возвращать raw source values на storefront. Storefront видит только configured `facet_value`.
- Не превращать category в storefront facet. Category остается navigation scope и rule field.
- Не вводить отдельные token tables вида `product_facet_token` / `variant_option_token`, пока реальные планы запросов и метрики не покажут проблему.

## Новая схема

Старые таблицы удаляются:

```sql
DROP TABLE IF EXISTS catalog.variant_search_index;
DROP TABLE IF EXISTS catalog.product_search_index;
```

Создаются новые таблицы с именами, которые отражают назначение:

- `catalog.product_listing_index`
- `catalog.variant_listing_index`

Обе таблицы становятся currency-aware. Это убирает special-case для price range/sort и позволяет строить listing в request currency. Если проект сейчас имеет одну валюту, будет одна строка на product/variant.

### `catalog.product_listing_index`

Одна строка на product + currency. Таблица содержит product-level predicates и агрегаты по active variants в этой валюте.

```sql
CREATE TABLE catalog.product_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  currency               varchar(3) NOT NULL,

  kind                   catalog.product_kind NOT NULL,
  vendor_id              uuid,
  handle                 varchar(255),
  status                 varchar(16) NOT NULL, -- 'published' | 'draft'
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  product_updated_at     timestamptz NOT NULL,
  product_revision       int NOT NULL DEFAULT 0,

  tag_handles            text[] NOT NULL DEFAULT '{}'::text[],
  feature_value_handles  text[] NOT NULL DEFAULT '{}'::text[],
  category_handles       text[] NOT NULL DEFAULT '{}'::text[],

  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,
  min_price_minor        bigint,
  max_price_minor        bigint,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id, currency)
);
```

Column semantics:

- `status` derived from product visibility: `published_at IS NOT NULL` and product is not deleted.
- Soft-deleted products should have all index rows deleted, not kept with `status = 'deleted'`.
- `feature_value_handles` uses composite source handles: `feature_slug:value_slug`.
- `category_handles` is used for navigation scope and collection rules, not storefront facet aggregation.
- `min_price_minor` / `max_price_minor` are storefront filter/sort aggregates
  from active in-stock variant rows in the same currency where
  `has_price = true`. Out-of-stock variant prices do not affect listing price
  filters, price ranges or price sort.
- `in_stock` and `total_stock` are aggregates from active variants. They are duplicated per currency intentionally to keep listing query centered on one primary table.

Indexes:

```sql
CREATE INDEX idx_product_listing_project_currency_product
  ON catalog.product_listing_index (project_id, currency, product_id);

CREATE INDEX idx_product_listing_visible_newest
  ON catalog.product_listing_index (
    project_id,
    currency,
    in_stock DESC,
    published_at DESC NULLS LAST,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_visible_created
  ON catalog.product_listing_index (
    project_id,
    currency,
    in_stock DESC,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_visible_price_asc
  ON catalog.product_listing_index (
    project_id,
    currency,
    in_stock DESC,
    min_price_minor ASC,
    product_id
  )
  WHERE status = 'published' AND min_price_minor IS NOT NULL;

CREATE INDEX idx_product_listing_visible_price_desc
  ON catalog.product_listing_index (
    project_id,
    currency,
    in_stock DESC,
    min_price_minor DESC,
    product_id
  )
  WHERE status = 'published' AND min_price_minor IS NOT NULL;

CREATE INDEX idx_product_listing_vendor
  ON catalog.product_listing_index (project_id, currency, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_product_listing_in_stock
  ON catalog.product_listing_index (project_id, currency, in_stock);

CREATE INDEX idx_product_listing_tag_handles_gin
  ON catalog.product_listing_index USING GIN (tag_handles);

CREATE INDEX idx_product_listing_feature_value_handles_gin
  ON catalog.product_listing_index USING GIN (feature_value_handles);

CREATE INDEX idx_product_listing_category_handles_gin
  ON catalog.product_listing_index USING GIN (category_handles);
```

### `catalog.variant_listing_index`

Одна строка на variant + currency. Таблица содержит variant-level predicates
для корректного option/price filtering и availability-aware storefront
matching.

```sql
CREATE TABLE catalog.variant_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  variant_id             uuid NOT NULL REFERENCES catalog.variant(id) ON DELETE CASCADE,
  currency               varchar(3) NOT NULL,

  kind                   catalog.product_kind NOT NULL,
  variant_created_at     timestamptz NOT NULL,
  variant_updated_at     timestamptz NOT NULL,

  option_value_handles   text[] NOT NULL DEFAULT '{}'::text[],
  price_minor            bigint,
  has_price              boolean NOT NULL DEFAULT false,
  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id, currency)
);
```

Column semantics:

- `option_value_handles` uses composite source handles: `option_slug:value_slug`.
- Rows are written for active variants and enabled project currencies.
- If a variant has no price in a currency, keep the row with `has_price = false`
  and `price_minor = NULL`. Price filters exclude it; option filters can still
  evaluate it when the row is in stock.
- Storefront variant matching uses only rows where `in_stock = true`.
  Out-of-stock variants do not satisfy option filters, price filters, option
  counts, matched variant price sort or variant-level collection rules.
- Deleted variants should have all currency rows deleted.

Indexes:

```sql
CREATE INDEX idx_variant_listing_project_currency_product
  ON catalog.variant_listing_index (project_id, currency, product_id);

CREATE INDEX idx_variant_listing_project_currency_variant
  ON catalog.variant_listing_index (project_id, currency, variant_id);

CREATE INDEX idx_variant_listing_product_price
  ON catalog.variant_listing_index (
    project_id,
    currency,
    product_id,
    price_minor
  )
  WHERE has_price = true AND in_stock = true;

CREATE INDEX idx_variant_listing_price
  ON catalog.variant_listing_index (project_id, currency, price_minor)
  WHERE has_price = true AND in_stock = true;

CREATE INDEX idx_variant_listing_in_stock
  ON catalog.variant_listing_index (project_id, currency, in_stock);

CREATE INDEX idx_variant_listing_option_value_handles_gin
  ON catalog.variant_listing_index USING GIN (option_value_handles);
```

## Facet tables

`facet`, `facet_value`, `facet_value_source_handle` остаются canonical configuration layer.

Допустимые `facet_type`:

- `tag` -> `product_listing_index.tag_handles`
- `feature` -> `product_listing_index.feature_value_handles`
- `option` -> `variant_listing_index.option_value_handles`
- `price` -> `variant_listing_index.price_minor`
- `in_stock` -> `variant_listing_index.in_stock`

`category` не добавлять в `facet_type` для storefront PLP. Для rules и scope используется `category_handles`.

Требования к операциям:

- Resolve `facetSlug:valueSlug` должен быть batch query, а не N запросов в цикле.
- Resolve возвращает `facet_id`, `facet_type`, `facet_value_id`, `source_handles`.
- Values без enabled `facet_value` и без `facet_value_source_handle` игнорируются.
- Если один `facet_value` имеет несколько source handles, counts группируются по `facet_value_id` и используют `COUNT(DISTINCT product_id)`.
- Facet isolation всегда делается по `facet_id`, не по `facet_type`.

## Filter semantics

Product-level filters:

- `tag`
- `feature`
- `vendor_id` как явный filter, не generic facet
- `category_handles` только для navigation scope и collection rules

Variant-level filters:

- `option`
- `price`

Availability filter:

- `in_stock` как storefront availability toggle по product aggregate
  `product_listing_index.in_stock`. Variant-level matching уже всегда
  ограничен in-stock variant rows.

Правила комбинирования:

- OR внутри одного facet id.
- AND между разными facet id.
- Variant-level filters должны быть в одном in-stock variant predicate group.
  Нельзя проверять `color:red` на одном variant, а `size:xl` или price на
  другом.
- Option filters, price filters, option counts and matched variant sort all
  require `vli.in_stock = true`.
- Price filters additionally use `has_price = true` и `price_minor`.
- `price` и `in_stock` являются virtual facets: у них нет `facet_value_source_handle`.

## Listing query flow

Все listing queries строятся как SQL-driven pipeline. TypeScript отвечает за parsing input, resolve filters, сбор SQL fragments и mapping результата.

### 1. Resolve request

Input normalizer:

1. Определяет `project_id`, `currency`, `locale`.
2. Определяет listing scope: category, manual collection или rule collection.
3. Batch-resolve generic facet tokens через `facet` + `facet_value` + `facet_value_source_handle`.
4. Группирует resolved filters по `facet_id`.
5. Отдельно нормализует явные filters: `price`, `in_stock`, `vendor_id`.
6. Собирает sort descriptor.

### 2. Scope CTE

Category scope:

```sql
WITH scope_products AS (
  SELECT pc.product_id, pc.lexo_rank AS manual_rank
  FROM catalog.product_category pc
  WHERE pc.project_id = :projectId
    AND pc.category_id = :categoryId
)
```

Manual collection scope:

```sql
WITH scope_products AS (
  SELECT ci.product_id, ci.lexo_rank AS manual_rank
  FROM catalog.collection_item ci
  WHERE ci.project_id = :projectId
    AND ci.collection_id = :collectionId
)
```

Rule collection scope:

```sql
WITH scope_products AS (
  SELECT pli.product_id, NULL::text AS manual_rank
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.currency = :currency
    AND pli.status = 'published'
    -- compiled collection product-level rules
    -- variant-level rules are applied through EXISTS over variant_listing_index
)
```

### 3. Base product set

`base_all` is the stable universe for facets. It includes scope and visibility, but does not apply user facet filters.

```sql
base_all AS (
  SELECT
    pli.*,
    sp.manual_rank
  FROM scope_products sp
  JOIN catalog.product_listing_index pli
    ON pli.product_id = sp.product_id
   AND pli.project_id = :projectId
   AND pli.currency = :currency
  WHERE pli.status = 'published'
)
```

### 4. Active filter booleans

For every active product-level facet id generate one boolean column:

```sql
base AS (
  SELECT
    b.*,
    (b.tag_handles && :tagFacetSourceHandles::text[]) AS passes_f_tag_sale,
    (b.feature_value_handles && :featureFacetSourceHandles::text[]) AS passes_f_feature_material
  FROM base_all b
)
```

If a facet id has no selected values, do not generate a boolean for it. Never execute `array && '{}'`.

### 5. Variant pass set

Only materialize this CTE when at least one variant-level predicate is active or sort by matched price is requested.

```sql
variant_pass_products AS (
  SELECT DISTINCT vli.product_id
  FROM catalog.variant_listing_index vli
  JOIN base_all b ON b.product_id = vli.product_id
  WHERE vli.project_id = :projectId
    AND vli.currency = :currency
    -- storefront variant matching uses only in-stock variants
    AND vli.in_stock = true
    -- one predicate per active OPTION facet id
    AND (vli.option_value_handles && :colorHandles::text[])
    AND (vli.option_value_handles && :sizeHandles::text[])
    -- price filter
    AND (:priceMin IS NULL OR (vli.has_price = true AND vli.price_minor >= :priceMin))
    AND (:priceMax IS NULL OR (vli.has_price = true AND vli.price_minor <= :priceMax))
)
```

Then attach it to `base`:

```sql
filtered_products AS (
  SELECT b.*
  FROM base b
  LEFT JOIN variant_pass_products vpp ON vpp.product_id = b.product_id
  WHERE
    -- all active product-level facet booleans
    b.passes_f_tag_sale
    AND b.passes_f_feature_material
    -- explicit product filters
    AND (:vendorId IS NULL OR b.vendor_id = :vendorId)
    AND (:inStockOnly = false OR b.in_stock = true)
    -- variant filters
    AND (:variantFiltersActive = false OR vpp.product_id IS NOT NULL)
)
```

For rule collections, compiled variant rules use the same single-EXISTS rule as storefront filters.

## Sort

All sorts must be deterministic. All storefront sorts start by grouping products by
availability: `in_stock DESC`, so sellable/in-stock products are shown before
out-of-stock products. Then apply the requested sort keys. Always append
`product_id ASC` as final tie-breaker.

### Manual

Category and manual collection:

```sql
ORDER BY in_stock DESC, manual_rank ASC NULLS LAST, product_id ASC
```

Rule collections do not have manual rank. They fall back to collection default sort or `newest`.

### Newest

```sql
ORDER BY in_stock DESC, published_at DESC NULLS LAST, product_created_at DESC, product_id ASC
```

### Created

```sql
ORDER BY in_stock DESC, product_created_at DESC, product_id ASC
```

### Name

Name is locale-dependent and stays outside listing index. Join `product_translation` only for this sort:

```sql
LEFT JOIN catalog.product_translation pt
  ON pt.project_id = fp.project_id
 AND pt.product_id = fp.product_id
 AND pt.locale = :locale
ORDER BY fp.in_stock DESC, pt.name ASC NULLS LAST, fp.product_id ASC
```

### Price

When there are no active variant-level filters, use product aggregates. These
aggregates are computed only from in-stock variants:

```sql
ORDER BY in_stock DESC, min_price_minor ASC NULLS LAST, product_id ASC
```

When `OPTION`, `price` or `in_stock` filters are active, compute price from
matching in-stock variants:

```sql
matched_variant_prices AS (
  SELECT
    vli.product_id,
    MIN(vli.price_minor) AS sort_price_minor
  FROM catalog.variant_listing_index vli
  JOIN filtered_products fp ON fp.product_id = vli.product_id
  WHERE vli.project_id = :projectId
    AND vli.currency = :currency
    AND vli.has_price = true
    AND vli.in_stock = true
    -- same active variant predicates as listing filter
  GROUP BY vli.product_id
)
ORDER BY fp.in_stock DESC, mvp.sort_price_minor ASC NULLS LAST, fp.product_id ASC
```

For `price_desc`, use `MAX(vli.price_minor)` over matching in-stock variants or
`max_price_minor DESC` depending on product requirements. Default
recommendation: `price_asc` uses lowest matching in-stock variant price;
`price_desc` uses highest matching in-stock variant price.

## Facet aggregation

Facet aggregation uses `base_all`, not only current page items.

### Product-level discrete facets

Unnest source handles from `base_all`, map them through `facet_value_source_handle`, then aggregate by `facet_value_id`.

```sql
product_sources AS (
  SELECT b.product_id, 'tag' AS facet_type, source_handle
  FROM base b, unnest(b.tag_handles) AS source_handle
  UNION ALL
  SELECT b.product_id, 'feature' AS facet_type, source_handle
  FROM base b, unnest(b.feature_value_handles) AS source_handle
),
product_mapped AS (
  SELECT
    ps.product_id,
    fvsh.facet_id,
    fvsh.facet_value_id
  FROM product_sources ps
  JOIN catalog.facet_value_source_handle fvsh
    ON fvsh.project_id = :projectId
   AND fvsh.facet_type = ps.facet_type
   AND fvsh.source_handle = ps.source_handle
  JOIN catalog.facet_value fv
    ON fv.id = fvsh.facet_value_id
   AND fv.facet_id = fvsh.facet_id
   AND fv.enabled = true
)
```

Counts use `FILTER` with all active filters except the current row's `facet_id`:

```sql
SELECT
  pm.facet_id,
  pm.facet_value_id,
  COUNT(DISTINCT pm.product_id)
    FILTER (
      WHERE
        -- product-level isolation
        (pm.facet_id = :tagFacetId OR passes_f_tag_sale)
        AND (pm.facet_id = :featureFacetId OR passes_f_feature_material)
        -- explicit filters
        AND (:vendorId IS NULL OR vendor_id = :vendorId)
        AND (:inStockOnly = false OR b.in_stock = true)
        -- variant pass
        AND (:variantFiltersActive = false OR product_id IN (SELECT product_id FROM variant_pass_products))
    ) AS count
FROM product_mapped pm
JOIN base b ON b.product_id = pm.product_id
GROUP BY pm.facet_id, pm.facet_value_id;
```

### Option facet counts

Option counts are variant-correct and count products, not variants.

```sql
option_sources AS (
  SELECT
    vli.product_id,
    source_handle
  FROM catalog.variant_listing_index vli
  JOIN base b ON b.product_id = vli.product_id
  CROSS JOIN LATERAL unnest(vli.option_value_handles) AS source_handle
  WHERE vli.project_id = :projectId
    AND vli.currency = :currency
    AND vli.in_stock = true
    -- active product-level filters stay applied
    AND b.passes_f_tag_sale
    AND b.passes_f_feature_material
    -- active option filters except current option facet are injected per count query
    -- active price filter stays applied and also uses in-stock variants
    -- active in_stock toggle is applied through b.in_stock
),
option_mapped AS (
  SELECT
    os.product_id,
    fvsh.facet_id,
    fvsh.facet_value_id
  FROM option_sources os
  JOIN catalog.facet_value_source_handle fvsh
    ON fvsh.project_id = :projectId
   AND fvsh.facet_type = 'option'
   AND fvsh.source_handle = os.source_handle
  JOIN catalog.facet_value fv
    ON fv.id = fvsh.facet_value_id
   AND fv.facet_id = fvsh.facet_id
   AND fv.enabled = true
)
SELECT
  facet_id,
  facet_value_id,
  COUNT(DISTINCT product_id) AS count
FROM option_mapped
GROUP BY facet_id, facet_value_id;
```

For each option facet id, omit only that facet's option predicate. Keep all
other option predicates, product-level predicates, price predicates and
availability toggle. Option counts are computed only from in-stock variants.

### Price range

Price range is a virtual facet. It excludes the active price predicate but keeps
product-level filters, option filters and availability toggle. The range is
calculated only from in-stock variants, so out-of-stock variants never expand or
shrink the storefront price slider.

```sql
SELECT
  MIN(vli.price_minor) AS min_price_minor,
  MAX(vli.price_minor) AS max_price_minor
FROM catalog.variant_listing_index vli
JOIN base b ON b.product_id = vli.product_id
WHERE vli.project_id = :projectId
  AND vli.currency = :currency
  AND vli.has_price = true
  AND vli.in_stock = true
  -- product-level filters applied
  -- option filters applied
  -- in_stock availability toggle applied through base/product aggregate
  -- price filter omitted
```

### In-stock count

`IN_STOCK` is a virtual facet. It excludes the active availability toggle but
keeps product-level filters, option filters and price filter. Price filter
predicates and option predicates still evaluate only in-stock variants.

```sql
SELECT COUNT(DISTINCT vli.product_id) AS in_stock_count
FROM catalog.variant_listing_index vli
JOIN base b ON b.product_id = vli.product_id
WHERE vli.project_id = :projectId
  AND vli.currency = :currency
  AND vli.in_stock = true
  -- product-level filters applied
  -- option filters applied
  -- price filter applied
  -- in_stock availability toggle omitted
```

### Total count

Total count uses all active filters without isolation:

```sql
SELECT COUNT(*) AS total_count
FROM filtered_products;
```

## Write operations and sync lifecycle

### Repositories

Replace current repositories:

- `SearchIndexRepository` -> `ProductListingIndexRepository`
- `VariantSearchIndexRepository` -> `VariantListingIndexRepository`

Add a dedicated query repository:

- `ListingQueryRepository`
- `FacetAggregationRepository`

Repository methods should use `BaseRepository.connection` and always include `project_id` from context.

### Scripts

Replace scripts:

- `SyncProductIndexScript` -> `SyncProductListingIndexScript`
- `SyncVariantIndexScript` -> `SyncVariantListingIndexScript`
- `DeleteProductIndexScript` -> `DeleteProductListingIndexScript`
- `RebuildProductIndexScript` / `RebuildVariantIndexScript` -> `RebuildListingIndexScript`

`SyncVariantListingIndexScript`:

1. Load active variants for product or requested variant ids.
2. Load option links and build `option_value_handles`.
3. Load project enabled currencies.
4. Load current price per variant/currency.
5. Load inventory offers per variant.
6. Upsert one row per active variant/currency.
7. Delete rows for removed/deleted variants.
8. Trigger product aggregate refresh for affected products/currencies.

`SyncProductListingIndexScript`:

1. Load product.
2. If product is deleted or missing, delete product and variant listing rows.
3. Load categories, tags, features and build arrays.
4. Load variant aggregates from `variant_listing_index` grouped by currency.
   Price aggregates use only rows with `has_price = true` and
   `in_stock = true`; stock aggregates still use all active variants.
5. Upsert one row per product/currency.
6. If no currency rows exist yet, create rows for enabled project currencies with empty aggregates.

`RebuildListingIndexScript`:

1. Truncate both listing index tables.
2. Process products in batches.
3. Sync variant index before product aggregates.
4. Sync product index aggregates second.
5. Log total products, variants, currencies and skipped rows.

### Event coverage

Events that must refresh listing index:

- Product created/updated/deleted.
- Product publish/unpublish.
- Product category assignment changed.
- Category handle changed: refresh affected products.
- Product tag assignment changed.
- Tag handle changed: refresh affected products.
- Product feature/value changed.
- Feature slug/value slug changed: refresh affected products.
- Variant created/updated/deleted.
- Variant option links changed.
- Option slug/value slug changed: refresh affected variants.
- Variant price changed: refresh affected variant/currency and product aggregate.
- Inventory/stock changed: refresh affected variant stock and product aggregate.
- Project enabled currencies changed: rebuild listing index for project.

Facet configuration changes do not require listing index rebuild unless source handles themselves changed. They only affect resolution and aggregation mapping.

## Implementation order

1. Add Drizzle models for `product_listing_index` and `variant_listing_index`.
2. Generate migration that drops old search index tables and creates new listing index tables.
3. Replace repository classes and register them in `Repository`.
4. Replace sync/delete/rebuild scripts.
5. Update catalog event handlers to call listing index scripts.
6. Add missing event handlers for price and inventory changes.
7. Replace in-memory `buildListingFacets` with SQL aggregation repository.
8. Implement category listing query on `ListingQueryRepository`.
9. Implement collection listing query on the same query foundation.
10. Remove old `search-index` exports after callers are migrated.

## Acceptance criteria

- Product-level filters use `product_listing_index`.
- Variant-level filters use one grouped in-stock predicate over
  `variant_listing_index`.
- Price sort uses product aggregate only when there are no active variant-level filters; otherwise it uses matched variant prices.
- Option filter, option counts, price filter, price range, price sort and
  variant-level collection rules use only in-stock variants.
- All storefront sorts place in-stock products before out-of-stock products.
- Facet counts are computed over full scope, not current page items.
- Facet counts isolate by `facet_id`.
- Option counts use `COUNT(DISTINCT product_id)`.
- Merged `facet_value_source_handle` values do not double-count products.
- Invalid/unconfigured facet values are ignored.
- Listing queries do not load all candidate products/variants into memory.
- Full rebuild can recreate both index tables from source tables.

## Deferred optimization

Keep arrays + GIN for now:

- `tag_handles`
- `feature_value_handles`
- `category_handles`
- `option_value_handles`

Do not introduce normalized token tables until actual query plans, row counts and latency show that `unnest + GIN + COUNT(DISTINCT)` is the bottleneck. If that happens later, introduce inverted-index tables as a measured optimization:

- `product_listing_token(project_id, currency, product_id, facet_type, source_handle)`
- `variant_listing_token(project_id, currency, product_id, variant_id, source_handle)`

That is a separate migration and should be justified by `EXPLAIN ANALYZE` and production-like data volume.
