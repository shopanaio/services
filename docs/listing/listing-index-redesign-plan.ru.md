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
- Фильтровать rule collections по `category_handles`, configured tag/feature
  facet values, product kind, dates and visibility fields where supported by
  rule compiler. Tag/feature rule predicates на storefront read path должны
  компилироваться в resolved `facet_id` / `facet_value_id` predicates поверх
  `product_listing_facet_token`, а не в runtime checks по `tag_handles` /
  `feature_value_handles`.
- Поддерживать OR внутри одного product-level `facet_id`.
- Поддерживать AND между разными product-level `facet_id`.
- Игнорировать invalid или unconfigured facet values, которые не резолвятся в
  `facet_value` + `facet_value_source_handle`.

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

### Facet resolution

- Batch-resolve storefront tokens `facetSlug:valueSlug` через `facet`,
  `facet_value` и `facet_value_source_handle`.
- Возвращать на storefront только configured facets и `facet_value` rows,
  у которых есть source mapping.
- Не возвращать raw tag/feature/option source handles наружу.
- Поддерживать merged values: один `facet_value` может мапиться на несколько
  source handles.
- Не показывать values без source mapping.

### Facet aggregation

- Считать facet counts по full listing scope, а не по текущей странице товаров.
- Считать product-level facet counts для tag и feature.
- Считать option facet counts variant-correct только по in-stock variants и
  считать products, а не variants. Дедупликация должна происходить отдельным
  CTE/subquery по `(product_id, facet_id, facet_value_id)`, после чего внешний
  aggregation использует `COUNT(*)`.
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
5. Вынести storefront facet tokens в отдельные read-model таблицы, чтобы
   runtime listing queries работали с готовыми `facet_id` / `facet_value_id`,
   а не разворачивали source-handle arrays и не мапили их через
   `facet_value_source_handle` на каждом request.

## Не цели

- Не строить full-text search. Название, description и SEO translations остаются вне listing index.
- Не делать совместимость со старыми `product_search_index` / `variant_search_index`.
- Не возвращать raw source values на storefront. Storefront видит только configured `facet_value`.
- Не превращать category в storefront facet. Category остается navigation scope и rule field.
- Не предагрегировать facet counts в отдельные счетчики. Counts остаются
  request-dependent из-за scope, active filters и facet isolation.
- Не использовать token tables для virtual facets `price` и `in_stock`.
  Они считаются из price/stock полей listing index.

## Новая схема

Старые таблицы удаляются:

```sql
DROP TABLE IF EXISTS catalog.variant_search_index;
DROP TABLE IF EXISTS catalog.product_search_index;
```

Создаются новые таблицы с именами, которые отражают назначение:

- `catalog.product_listing_index`
- `catalog.variant_listing_index`
- `catalog.product_listing_facet_token`
- `catalog.variant_listing_facet_token`

Все listing read-model таблицы становятся currency-aware. Это убирает
special-case для price range/sort и позволяет строить listing в request
currency. Если проект сейчас имеет одну валюту, будет одна строка на
product/variant и один currency-sliced набор facet tokens.

### `catalog.product_listing_index`

Одна строка на product + currency. Таблица содержит product-level predicates и агрегаты по active variants в этой валюте.

```sql
CREATE TABLE catalog.product_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
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

  PRIMARY KEY (project_id, product_id, currency),
  CONSTRAINT fk_product_listing_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_status
    CHECK (status IN ('published', 'draft'))
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
    max_price_minor DESC,
    product_id
  )
  WHERE status = 'published' AND max_price_minor IS NOT NULL;

CREATE INDEX idx_product_listing_vendor
  ON catalog.product_listing_index (project_id, currency, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_product_listing_in_stock
  ON catalog.product_listing_index (project_id, currency, in_stock);

CREATE INDEX idx_product_listing_category_handles_gin
  ON catalog.product_listing_index USING GIN (category_handles);
```

`tag_handles` and `feature_value_handles` are kept as source read-model fields
for rebuild/debug and source-handle based backoffice diagnostics. Storefront
facet filtering/counts and rule-collection tag/feature predicates must use
`product_listing_facet_token`. Do not add product tag/feature GIN indexes for
storefront reads unless a future rule field cannot be represented through
configured facets and `EXPLAIN ANALYZE` proves the source-array path is needed.

### `catalog.variant_listing_index`

Одна строка на variant + currency. Таблица содержит variant-level predicates
для корректного option/price filtering и availability-aware storefront
matching.

```sql
CREATE TABLE catalog.variant_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
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

  PRIMARY KEY (project_id, variant_id, currency),
  CONSTRAINT fk_variant_listing_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_variant
    FOREIGN KEY (project_id, product_id, variant_id)
    REFERENCES catalog.variant(project_id, product_id, id)
    ON DELETE CASCADE
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
```

`option_value_handles` is kept as a source read-model field for rebuild/debug
and rule compilation. Storefront option filtering/counts must use
`variant_listing_facet_token`, not runtime `unnest(option_value_handles)`.

### `catalog.product_listing_facet_token`

One row per product + currency + resolved storefront facet value. This table is
the normalized inverted index for product-level storefront facets (`tag` and
`feature`). It stores resolved storefront ids, not raw source handles.

```sql
CREATE TABLE catalog.product_listing_facet_token (
  project_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,
  product_id             uuid NOT NULL,
  facet_id               uuid NOT NULL,
  facet_value_id         uuid NOT NULL,
  facet_type             varchar(16) NOT NULL, -- 'tag' | 'feature'
  indexed_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, currency, product_id, facet_id, facet_value_id),
  CONSTRAINT fk_product_listing_facet_token_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_listing_facet_token_facet
    FOREIGN KEY (project_id, facet_id)
    REFERENCES catalog.facet(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_listing_facet_token_value
    FOREIGN KEY (project_id, facet_id, facet_value_id)
    REFERENCES catalog.facet_value(project_id, facet_id, id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_facet_token_type
    CHECK (facet_type IN ('tag', 'feature'))
);
```

Indexes:

```sql
CREATE INDEX idx_product_listing_facet_token_count
  ON catalog.product_listing_facet_token (
    project_id,
    currency,
    facet_id,
    facet_value_id,
    product_id
  );

CREATE INDEX idx_product_listing_facet_token_product
  ON catalog.product_listing_facet_token (
    project_id,
    currency,
    product_id,
    facet_id,
    facet_value_id
  );
```

The primary key deduplicates merged mappings: if several source handles on the
same product resolve to the same `facet_value_id`, counts still see one token.

### `catalog.variant_listing_facet_token`

One row per variant + currency + resolved storefront option value. This table is
the normalized inverted index for variant-level option facets. It intentionally
keeps `variant_id`, because option and price predicates must match on the same
in-stock variant row.

```sql
CREATE TABLE catalog.variant_listing_facet_token (
  project_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,
  product_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
  facet_id               uuid NOT NULL,
  facet_value_id         uuid NOT NULL,
  indexed_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, currency, variant_id, facet_id, facet_value_id),
  CONSTRAINT fk_variant_listing_facet_token_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_facet_token_variant
    FOREIGN KEY (project_id, product_id, variant_id)
    REFERENCES catalog.variant(project_id, product_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_facet_token_facet
    FOREIGN KEY (project_id, facet_id)
    REFERENCES catalog.facet(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_facet_token_value
    FOREIGN KEY (project_id, facet_id, facet_value_id)
    REFERENCES catalog.facet_value(project_id, facet_id, id)
    ON DELETE CASCADE
);
```

Indexes:

```sql
CREATE INDEX idx_variant_listing_facet_token_count
  ON catalog.variant_listing_facet_token (
    project_id,
    currency,
    facet_id,
    facet_value_id,
    product_id,
    variant_id
  );

CREATE INDEX idx_variant_listing_facet_token_variant
  ON catalog.variant_listing_facet_token (
    project_id,
    currency,
    variant_id,
    facet_id,
    facet_value_id
  );

CREATE INDEX idx_variant_listing_facet_token_product
  ON catalog.variant_listing_facet_token (
    project_id,
    currency,
    product_id,
    facet_id,
    facet_value_id
  );
```

Token tables are currency-aware even when the underlying tag/feature/option
mapping is currency-independent. This keeps storefront queries on the same
`project_id + currency` partition as `product_listing_index` and
`variant_listing_index`, and avoids special-case joins in multi-currency
listings.

### External constraints and indexes required for listing operations

The listing index uses composite foreign keys that include `project_id`, so the
canonical tables must expose matching unique keys. Existing equivalent
constraints should be reused instead of duplicated.

```sql
-- Existing product/variant models already provide equivalent unique keys.
ALTER TABLE catalog.product
  ADD CONSTRAINT product_project_id_id_unique
  UNIQUE (project_id, id);

ALTER TABLE catalog.variant
  ADD CONSTRAINT variant_project_id_product_id_id_unique
  UNIQUE (project_id, product_id, id);

-- Add these if facet canonical tables do not already have equivalent keys.
ALTER TABLE catalog.facet
  ADD CONSTRAINT facet_project_id_id_unique
  UNIQUE (project_id, id);

ALTER TABLE catalog.facet_value
  ADD CONSTRAINT facet_value_project_id_facet_id_id_unique
  UNIQUE (project_id, facet_id, id);
```

The listing index does not replace scope and locale sort indexes on canonical
tables. These indexes are required for the planned query shapes:

```sql
CREATE INDEX idx_product_category_listing_scope
  ON catalog.product_category (project_id, category_id, lexo_rank, product_id);

CREATE INDEX idx_collection_item_listing_scope
  ON catalog.collection_item (project_id, collection_id, lexo_rank, product_id);

CREATE INDEX idx_product_translation_listing_name
  ON catalog.product_translation (project_id, locale, name, product_id);
```

If existing migrations already provide equivalent indexes, reuse them instead
of creating duplicates.

## Facet tables

`facet`, `facet_value`, `facet_value_source_handle` остаются canonical configuration layer.

Допустимые `facet_type`:

- `tag` -> `product_listing_facet_token`
- `feature` -> `product_listing_facet_token`
- `option` -> `variant_listing_facet_token`
- `price` -> `variant_listing_index.price_minor`
- `in_stock` -> `variant_listing_index.in_stock`

`category` не добавлять в `facet_type` для storefront PLP. Для rules и scope используется `category_handles`.

Требования к операциям:

- Resolve `facetSlug:valueSlug` должен быть batch query, а не N запросов в цикле.
- Storefront filter resolve возвращает `facet_id`, `facet_type` и
  `facet_value_id`; source handles не нужны на read path. Resolve должен
  проверять, что для value существует хотя бы один `facet_value_source_handle`,
  но не возвращать эти handles в listing query.
- Sync/rebuild token generation использует `facet_value_source_handle` как
  canonical mapping layer и пишет уже resolved `facet_id` / `facet_value_id`.
- Storefront resolve/aggregation игнорирует values без
  `facet_value_source_handle`.
- Token generation сохраняет mappings для существующих строк
  `facet_value_source_handle`.
- Если один `facet_value` имеет несколько source handles, token generation
  дедуплицирует их по primary key, а counts группируются по `facet_value_id`
  после явной дедупликации `(product_id, facet_id, facet_value_id)`.
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
3. Batch-resolve generic storefront tokens через `facet` + `facet_value`.
4. Группирует resolved filters по `facet_id`.
5. Отдельно нормализует явные filters: `price`, `in_stock`, `vendor_id`.
6. Собирает sort descriptor.

### 2. Scope CTE

Category scope:

```sql
WITH scope_products AS (
  SELECT
    pc.product_id,
    pc.lexo_rank AS manual_rank,
    NULL::numeric AS relevance_score
  FROM catalog.product_category pc
  WHERE pc.project_id = :projectId
    AND pc.category_id = :categoryId
)
```

Manual collection scope:

```sql
WITH scope_products AS (
  SELECT
    ci.product_id,
    ci.lexo_rank AS manual_rank,
    NULL::numeric AS relevance_score
  FROM catalog.collection_item ci
  WHERE ci.project_id = :projectId
    AND ci.collection_id = :collectionId
)
```

Rule collection scope:

```sql
WITH scope_products AS (
  SELECT
    pli.product_id,
    NULL::text AS manual_rank,
    NULL::numeric AS relevance_score
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.currency = :currency
    AND pli.status = 'published'
    -- compiled collection product-level rules:
    --   category rules can use category_handles / category scope joins
    --   tag/feature rules must use product_listing_facet_token EXISTS predicates
    --   scalar rules can use product_listing_index columns
    -- variant-level rules are applied through EXISTS over variant_listing_index
)
```

Global catalog scope:

```sql
WITH scope_products AS (
  SELECT pli.product_id, NULL::text AS manual_rank, NULL::numeric AS relevance_score
  FROM catalog.product_listing_index pli
  WHERE pli.project_id = :projectId
    AND pli.currency = :currency
    AND pli.status = 'published'
)
```

Search results scope:

Text search stays outside listing index. It provides an ephemeral candidate set
with product ids and relevance score. Listing index then applies visibility,
structured filters, facets, counts and business sort to that candidate set.

```sql
WITH search_candidates(product_id, relevance_score) AS (
  VALUES
    -- (:productId, :score), supplied by text search pipeline
),
scope_products AS (
  SELECT sc.product_id, NULL::text AS manual_rank, sc.relevance_score
  FROM search_candidates sc
)
```

Search candidate input must be passed as a SQL relation, not loaded and
filtered in TypeScript. `VALUES` is acceptable for hundreds or a few thousand
ids. For larger candidate sets, prefer unnested typed arrays. For large or
reused candidate sets, use a temp table with indexes on `product_id` and, when
needed, `relevance_score`. For relevance sort, cursor values include
`in_stock`, `relevance_score` and `product_id`.

### 3. Base product set

`base_all` is the stable universe for facets. It includes scope and visibility, but does not apply user facet filters.

```sql
base_all AS (
  SELECT
    pli.*,
    sp.manual_rank,
    sp.relevance_score
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
    EXISTS (
      SELECT 1
      FROM catalog.product_listing_facet_token plt
      WHERE plt.project_id = :projectId
        AND plt.currency = :currency
        AND plt.product_id = b.product_id
        AND plt.facet_id = :tagFacetId
        AND plt.facet_value_id = ANY(:tagFacetValueIds::uuid[])
    ) AS passes_f_tag_sale,
    EXISTS (
      SELECT 1
      FROM catalog.product_listing_facet_token plt
      WHERE plt.project_id = :projectId
        AND plt.currency = :currency
        AND plt.product_id = b.product_id
        AND plt.facet_id = :featureFacetId
        AND plt.facet_value_id = ANY(:featureFacetValueIds::uuid[])
    ) AS passes_f_feature_material
  FROM base_all b
)
```

If a facet id has no selected values, do not generate a boolean or empty
`ANY('{}')` predicate for it.

This boolean-`EXISTS` shape is the simple default and is easiest to combine with
facet isolation. On large global scopes or when many active facets are present,
it can become too expensive because every row in `base_all` evaluates several
semi-joins. The query builder must be able to switch to a candidate-first shape:
build the filtered product set through semi-joins or `INTERSECT` over the most
selective `product_listing_facet_token` predicates, then join that candidate set
back to `base_all` for sorting, totals and facet aggregation. Keep the default
shape until `EXPLAIN ANALYZE` shows the candidate-first plan is better for the
target data distribution.

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
    -- one token predicate per active OPTION facet id; all predicates are
    -- anchored to the same vli.variant_id
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token vlt
      WHERE vlt.project_id = :projectId
        AND vlt.currency = :currency
        AND vlt.variant_id = vli.variant_id
        AND vlt.facet_id = :colorFacetId
        AND vlt.facet_value_id = ANY(:colorFacetValueIds::uuid[])
    )
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token vlt
      WHERE vlt.project_id = :projectId
        AND vlt.currency = :currency
        AND vlt.variant_id = vli.variant_id
        AND vlt.facet_id = :sizeFacetId
        AND vlt.facet_value_id = ANY(:sizeFacetValueIds::uuid[])
    )
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

This sort requires an index equivalent to
`product_translation(project_id, locale, name, product_id)`.

### Relevance

Relevance is available only for search results listing and comes from the search
candidate set, not from listing index.

```sql
ORDER BY fp.in_stock DESC, fp.relevance_score DESC NULLS LAST, fp.product_id ASC
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
    -- same active variant predicates as listing filter, anchored to this
    -- vli.variant_id through variant_listing_facet_token EXISTS predicates
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

Aggregation должен быть ограничен storefront-configured facets для текущего
project/listing context. Нельзя агрегировать каждый token, который когда-либо
был сгенерирован. Aggregation repository сначала должен resolve configured
`facet_id` и values, у которых есть source mappings, а затем считать только
matching `facet_id` / `facet_value_id` tokens. Это сохраняет counts
согласованными со storefront configuration без runtime `unnest`,
source-handle mapping или full-page in-memory filtering.

### Product-level discrete facets

Product-level counts join `base` to precomputed tokens and aggregate by
`facet_value_id`. The query still runs over the full listing scope, not the
current page.

```sql
product_tokens AS (
  SELECT
    b.product_id,
    plt.facet_id,
    plt.facet_value_id
  FROM base b
  JOIN catalog.product_listing_facet_token plt
    ON plt.project_id = :projectId
   AND plt.currency = :currency
   AND plt.product_id = b.product_id
   AND plt.facet_id = ANY(:productFacetIds::uuid[])
)
```

Counts use `FILTER` with all active filters except the current row's `facet_id`:

```sql
SELECT
  pt.facet_id,
  pt.facet_value_id,
  COUNT(*)
    FILTER (
      WHERE
        -- product-level isolation
        (pt.facet_id = :tagFacetId OR passes_f_tag_sale)
        AND (pt.facet_id = :featureFacetId OR passes_f_feature_material)
        -- explicit filters
        AND (:vendorId IS NULL OR b.vendor_id = :vendorId)
        AND (:inStockOnly = false OR b.in_stock = true)
        -- variant pass
        AND (:variantFiltersActive = false OR b.product_id IN (SELECT product_id FROM variant_pass_products))
    ) AS count
FROM product_tokens pt
JOIN base b ON b.product_id = pt.product_id
GROUP BY pt.facet_id, pt.facet_value_id;
```

`product_listing_facet_token` has one row per
`(product_id, facet_id, facet_value_id)` by primary key, so product-level counts
can use direct `COUNT(*)`.

### Option facet counts

Option counts are variant-correct and count products, not variants. The query
builder must generate isolation per option `facet_id`; there is no single
generic `option_variant_tokens` CTE that can correctly isolate all option facets
at once.

For each option facet being returned, generate a branch that omits only that
facet's active predicate and keeps all other active option predicates anchored
to the same `vli.variant_id`. The branches can be combined with `UNION ALL` or
an equivalent LATERAL shape.

```sql
WITH option_variant_tokens AS (
  -- Branch generated for :colorFacetId. It returns color values while omitting
  -- only the active color predicate.
  SELECT
    vli.product_id,
    vlt.facet_id,
    vlt.facet_value_id
  FROM catalog.variant_listing_index vli
  JOIN base b ON b.product_id = vli.product_id
  JOIN catalog.variant_listing_facet_token vlt
    ON vlt.project_id = :projectId
   AND vlt.currency = :currency
   AND vlt.variant_id = vli.variant_id
   AND vlt.facet_id = :colorFacetId
  WHERE vli.project_id = :projectId
    AND vli.currency = :currency
    AND vli.in_stock = true
    -- active product-level filters stay applied
    AND b.passes_f_tag_sale
    AND b.passes_f_feature_material
    -- color predicate is omitted for color counts
    -- every other active option predicate stays anchored to vli.variant_id
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token size_filter
      WHERE size_filter.project_id = :projectId
        AND size_filter.currency = :currency
        AND size_filter.variant_id = vli.variant_id
        AND size_filter.facet_id = :sizeFacetId
        AND size_filter.facet_value_id = ANY(:sizeFacetValueIds::uuid[])
    )
    -- active price filter stays applied and also uses in-stock variants
    -- active in_stock toggle is applied through b.in_stock

  UNION ALL

  -- Branch generated for :sizeFacetId. It returns size values while omitting
  -- only the active size predicate.
  SELECT
    vli.product_id,
    vlt.facet_id,
    vlt.facet_value_id
  FROM catalog.variant_listing_index vli
  JOIN base b ON b.product_id = vli.product_id
  JOIN catalog.variant_listing_facet_token vlt
    ON vlt.project_id = :projectId
   AND vlt.currency = :currency
   AND vlt.variant_id = vli.variant_id
   AND vlt.facet_id = :sizeFacetId
  WHERE vli.project_id = :projectId
    AND vli.currency = :currency
    AND vli.in_stock = true
    -- active product-level filters stay applied
    AND b.passes_f_tag_sale
    AND b.passes_f_feature_material
    -- size predicate is omitted for size counts
    -- every other active option predicate stays anchored to vli.variant_id
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_facet_token color_filter
      WHERE color_filter.project_id = :projectId
        AND color_filter.currency = :currency
        AND color_filter.variant_id = vli.variant_id
        AND color_filter.facet_id = :colorFacetId
        AND color_filter.facet_value_id = ANY(:colorFacetValueIds::uuid[])
    )
    -- active price filter stays applied and also uses in-stock variants
    -- active in_stock toggle is applied through b.in_stock
),
option_product_values AS (
  SELECT
    product_id,
    facet_id,
    facet_value_id
  FROM option_variant_tokens
  GROUP BY product_id, facet_id, facet_value_id
)
SELECT
  facet_id,
  facet_value_id,
  COUNT(*) AS count
FROM option_product_values
GROUP BY facet_id, facet_value_id;
```

For each option facet id, omit only that facet's option predicate. Keep all
other option predicates, product-level predicates, price predicates and
availability toggle. Option counts are computed only from in-stock variants.
The omitted-predicate logic must be generated per option `facet_id`; grouping by
`facet_type = option` would incorrectly make different option facets isolate
each other. A shared precomputed product-level pass set is not sufficient for
option counts, because it can lose the same-variant relationship between active
option predicates.

The `option_product_values` CTE is the explicit deduplication step that turns
variant-level matches into product-level facet values before counting. This
grouping plus facet isolation is expected to be one of the most expensive
storefront aggregation paths. It is acceptable for the first implementation
because it preserves correct PLP semantics, but it must be validated with
`EXPLAIN ANALYZE` on production-like catalogs before release. If it does not fit
the latency budget, optimize the query shape or indexes before weakening product
deduplication or isolation semantics.

### Price range

Price range is a virtual facet. It excludes the active price predicate but keeps
product-level filters, option filters and availability toggle. The range is
calculated only from in-stock variants, so out-of-stock variants never expand or
shrink the storefront price slider.

When option filters are active, price range must apply those option predicates
to the same `vli.variant_id` row whose `price_minor` participates in `MIN` /
`MAX`. It must not reuse a product-level variant pass set, because that would
allow one variant to satisfy options while another variant contributes the
price.

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
  -- option filters applied as EXISTS predicates anchored to vli.variant_id
  -- in_stock availability toggle applied through base/product aggregate
  -- price filter omitted
```

### In-stock count

`IN_STOCK` is a virtual facet. It excludes the active availability toggle but
keeps product-level filters, option filters and price filter. Price filter
predicates and option predicates still evaluate only in-stock variants.
If option and price filters are both active, they must be evaluated against the
same `vli.variant_id` row before grouping to products.

```sql
in_stock_products AS (
  SELECT vli.product_id
  FROM catalog.variant_listing_index vli
  JOIN base b ON b.product_id = vli.product_id
  WHERE vli.project_id = :projectId
    AND vli.currency = :currency
    AND vli.in_stock = true
    -- product-level filters applied
    -- option filters applied as EXISTS predicates anchored to vli.variant_id
    -- price filter applied to the same vli row
    -- in_stock availability toggle omitted
  GROUP BY vli.product_id
)
SELECT COUNT(*) AS in_stock_count
FROM in_stock_products;
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

Add listing token and query repositories:

- `ProductListingFacetTokenRepository`
- `VariantListingFacetTokenRepository`
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
3. Resolve option source handles through `facet_value_source_handle` into
   `facet_id` / `facet_value_id` tokens.
4. Load project enabled currencies.
5. Load current price per variant/currency.
6. Load inventory offers per variant.
7. Upsert one `variant_listing_index` row per active variant/currency.
8. Replace `variant_listing_facet_token` rows for affected variants/currencies.
9. Delete rows for removed/deleted variants.
10. Trigger product aggregate refresh for affected products/currencies.

`SyncProductListingIndexScript`:

1. Load product.
2. If product is deleted or missing, delete product, variant and facet token
   listing rows.
3. Load categories, tags, features and build arrays.
4. Resolve tag and feature source handles through `facet_value_source_handle`
   into `facet_id` / `facet_value_id` tokens.
5. Load variant aggregates from `variant_listing_index` grouped by currency.
   Price aggregates use only rows with `has_price = true` and
   `in_stock = true`; stock aggregates still use all active variants.
6. Upsert one `product_listing_index` row per product/currency.
7. Replace `product_listing_facet_token` rows for affected products/currencies.
8. If no currency rows exist yet, create rows for enabled project currencies with empty aggregates.

Token generation должен писать только canonical resolved ids из существующих
строк `facet_value_source_handle`.

`RebuildListingIndexScript`:

1. Truncate product, variant and facet token listing tables.
2. Process products in batches.
3. Sync variant index before product aggregates.
4. Sync product index aggregates second.
5. Write variant tokens before product aggregates when variant ids are known.
6. Write product tokens after product source handles are loaded.
7. Log total products, variants, currencies, tokens and skipped rows.

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

Facet source mapping changes require token refresh:

- New/removed `facet_value_source_handle` for `tag` or `feature`: refresh
  product facet tokens for products that contain the affected source handles.
- New/removed `facet_value_source_handle` for `option`: refresh variant facet
  tokens for variants that contain the affected source handles.
- Facet value merge/split through source mappings: refresh affected tokens so
  deduplication happens against the new `facet_value_id`.
- If affected products/variants cannot be resolved cheaply, rebuild listing
  tokens for the project; this is acceptable before production data exists.

## Implementation order

1. Add Drizzle models for `product_listing_index`,
   `variant_listing_index`, `product_listing_facet_token` and
   `variant_listing_facet_token`.
2. Generate migration that drops old search index tables and creates new listing
   index/token tables.
3. Replace repository classes and register them in `Repository`.
4. Replace sync/delete/rebuild scripts.
5. Update catalog event handlers to call listing index scripts.
6. Add missing event handlers for price and inventory changes.
7. Replace in-memory `buildListingFacets` with SQL aggregation repository.
8. Implement category listing query on `ListingQueryRepository`.
9. Implement collection listing query on the same query foundation.
10. Remove old `search-index` exports after callers are migrated.

## Acceptance criteria

- Product visibility, vendor, availability aggregates and explicit product
  fields use `product_listing_index`.
- Product-level storefront facet filters and counts use
  `product_listing_facet_token`, not runtime `unnest(tag_handles)` or
  `unnest(feature_value_handles)`.
- Rule collection tag/feature predicates compile to
  `product_listing_facet_token` predicates. `tag_handles` and
  `feature_value_handles` are not indexed or scanned on the storefront read
  path for configured tag/feature rules.
- Variant-level filters use one grouped in-stock predicate over
  `variant_listing_index`.
- Option storefront filters and counts use `variant_listing_facet_token`, while
  keeping all active option predicates anchored to the same `variant_id`.
- Option facet count isolation is generated per option `facet_id` through
  separate branches such as `UNION ALL` or LATERAL. It must not use one shared
  `facet_type = option` isolation branch or a product-level variant pass set for
  all option facets.
- Price sort uses product aggregate only when there are no active variant-level filters; otherwise it uses matched variant prices.
- Option filter, option counts, price filter, price range, price sort and
  variant-level collection rules use only in-stock variants.
- Price range, matched variant price sort and in-stock virtual count never use a
  product-level variant pass as a substitute for same-variant matching. When
  option and price predicates are active, both are applied to the same
  `variant_listing_index.variant_id` before grouping back to products.
- All storefront sorts place in-stock products before out-of-stock products.
- Facet counts are computed over full scope, not current page items.
- Facet counts isolate by `facet_id`.
- Option counts deduplicate to `(product_id, facet_id, facet_value_id)` before
  final `COUNT(*)`; they do not count variants.
- Merged `facet_value_source_handle` values do not double-count products.
- Invalid/unconfigured facet values are ignored.
- Listing queries do not load all candidate products/variants into memory.
- Global catalog and search result listings use the same SQL listing pipeline as
  category and collection listings.
- Relevance sort is available only for search listings and uses score from the
  search candidate relation.
- Product and variant listing index primary keys include `project_id`.
- Listing read-model foreign keys include `project_id`: product rows reference
  `product(project_id, id)`, variant rows reference
  `variant(project_id, product_id, id)`, and facet token rows reference
  project-scoped `facet` / `facet_value` keys. The database must reject
  cross-project product, variant, facet or facet value combinations.
- Facet token primary keys include `project_id`, `currency` and the resolved
  `facet_id` / `facet_value_id`.
- Product price descending sort uses `max_price_minor` when no active
  variant-level filters exist.
- Full rebuild can recreate product, variant and token listing tables from
  source tables plus `facet_value_source_handle`.
- `EXPLAIN ANALYZE` on production-like data confirms acceptable plans for:
  visible sort queries, variant predicate grouping, product facet counts,
  option facet counts, price range and matched variant price sort.
- `EXPLAIN ANALYZE` specifically covers the expensive paths:
  option product-value deduplication with facet isolation, product token counts
  on global scope, and active-facet filtering on a large global catalog scope.

## Deferred optimization

Token tables remove runtime source-handle expansion and mapping, but they do not
remove all future optimization work. Validate these plans with production-like
data:

- product facet token counts with facet isolation;
- variant option token counts with same-variant predicates;
- price range and matched variant price sort with active option filters;
- category/manual collection scope joins before token aggregation.

If token-table deduplication/grouping becomes the next bottleneck, consider
narrower follow-up optimizations only with `EXPLAIN ANALYZE` evidence:

- partial indexes per high-cardinality facet group;
- tenant/currency partitioning for token tables;
- precomputed approximate counts only for unfiltered global/category scopes,
  never as a replacement for isolated filtered counts.
