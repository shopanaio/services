# Схема БД listing index

Документ фиксирует целевую PostgreSQL-схему read model для storefront listing:
выдача товаров, structured filtering, facet counts, total count, pagination и
sort. Нормативный источник требований:
`docs/listing/listing-index-redesign-plan.ru.md`.

`catalog.product_search_index` и `catalog.variant_search_index` считаются
устаревшими и заменяются таблицами ниже. Обратная совместимость, dual-write и
compatibility views не требуются: после миграции listing index пересобирается
полным rebuild.

## Общие правила

- Все таблицы scoped по `project_id`; каждый storefront/admin query должен
  ограничиваться текущим проектом.
- Основные listing таблицы и token tables currency-neutral. Денежные поля
  вынесены в отдельные per-currency таблицы.
- Storefront listing читает цену в default currency проекта.
- Soft-deleted products/variants не хранятся в listing index: строки должны
  удаляться каскадом или sync/rebuild script.
- Storefront facets работают через resolved `facet_id` и `facet_value_id`, а не
  через raw source handles.
- `price` и `in_stock` являются virtual facets и не имеют строк в token tables.
- Counts считаются по product cardinality. Variant-level facets сначала
  дедуплицируются до `(product_id, facet_id, facet_value_id)`.

## Удаляемые таблицы

```sql
DROP TABLE IF EXISTS catalog.variant_search_index;
DROP TABLE IF EXISTS catalog.product_search_index;
```

## `catalog.product_listing_index`

Одна строка на product. Таблица хранит product-level predicates,
availability-агрегаты и стабильные поля сортировки. Price aggregates вынесены в
`catalog.product_listing_price_index`.

```sql
CREATE TABLE catalog.product_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,

  kind                   catalog.product_kind NOT NULL,
  vendor_id              uuid,
  handle                 varchar(255),
  status                 varchar(16) NOT NULL,
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  product_updated_at     timestamptz NOT NULL,
  product_revision       int NOT NULL DEFAULT 0,

  tag_handles            text[] NOT NULL DEFAULT '{}'::text[],
  feature_value_handles  text[] NOT NULL DEFAULT '{}'::text[],
  category_handles       text[] NOT NULL DEFAULT '{}'::text[],

  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, product_id),
  CONSTRAINT fk_product_listing_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_status
    CHECK (status IN ('published', 'draft'))
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Tenant/project boundary. Используется во всех PK/FK/index prefixes и во всех listing queries. |
| `product_id` | Canonical product id из `catalog.product.id`. Вместе с `project_id` идентифицирует строку read model. |
| `kind` | Тип товара из `catalog.product_kind`; нужен для rule collections и возможных storefront predicates по типу. |
| `vendor_id` | Vendor product-level filter. Это явный фильтр, не generic facet. |
| `handle` | Storefront handle published product. Используется для read model diagnostics и возможной hydration опоры, но не заменяет canonical product data. |
| `status` | Listing visibility state: `published` или `draft`. Published означает `published_at IS NOT NULL` и product не deleted. Deleted products должны удаляться из index. |
| `published_at` | Дата публикации для `newest` sort; nullable для draft rows. |
| `product_created_at` | Canonical product creation time для `created` sort и tie-break после `published_at`. |
| `product_updated_at` | Canonical product update time для diagnostics/sync freshness checks. |
| `product_revision` | Product revision на момент индексации; помогает skip/retry logic и отладке stale rows. |
| `tag_handles` | Raw tag source handles для rebuild/debug/backoffice diagnostics. Storefront filtering/counts не должны читать это поле. |
| `feature_value_handles` | Raw feature source handles в формате `feature_slug:value_slug` для rebuild/debug. Storefront использует `product_listing_facet_token`. |
| `category_handles` | Category navigation/rule scope handles. Category не является storefront facet. |
| `in_stock` | Product-level availability aggregate: true, если есть sellable active in-stock variant. Всегда применяется перед пользовательской сортировкой. |
| `total_stock` | Currency-neutral суммарный stock по active variants. Используется для diagnostics и возможных availability labels. |
| `indexed_at` | Время создания/пересоздания строки index pipeline. |
| `updated_at` | Время последнего upsert строки listing index. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (project_id, product_id)` | Гарантирует одну listing строку на product внутри project и дает целевой ключ для joins. |
| `fk_product_listing_product` | Защищает read model от orphan rows и удаляет index row при удалении canonical product. |
| `chk_product_listing_status` | Фиксирует допустимые visibility states; deleted не допускается как status. |

### Индексы

```sql
CREATE INDEX idx_product_listing_project_product
  ON catalog.product_listing_index (project_id, product_id);

CREATE INDEX idx_product_listing_visible_newest
  ON catalog.product_listing_index (
    project_id,
    in_stock DESC,
    published_at DESC NULLS LAST,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_visible_created
  ON catalog.product_listing_index (
    project_id,
    in_stock DESC,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_vendor
  ON catalog.product_listing_index (project_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_product_listing_in_stock
  ON catalog.product_listing_index (project_id, in_stock);

CREATE INDEX idx_product_listing_category_handles_gin
  ON catalog.product_listing_index USING GIN (category_handles);
```

| Индекс | Комментарий |
| --- | --- |
| `idx_product_listing_project_product` | Явный lookup/join index по project + product. PK уже покрывает этот порядок, поэтому при реализации можно не создавать дубликат, если planner использует PK. |
| `idx_product_listing_visible_newest` | Покрывает default/newest storefront order: сначала in-stock, затем published date, затем created date и stable `product_id`. Partial predicate исключает drafts. |
| `idx_product_listing_visible_created` | Покрывает `created` sort с тем же availability bucket и stable tie-breaker. |
| `idx_product_listing_vendor` | Ускоряет explicit vendor filter. Partial predicate уменьшает размер, потому что products без vendor не участвуют в vendor lookup. |
| `idx_product_listing_in_stock` | Поддерживает availability toggle и in-stock virtual facet count на product aggregate. |
| `idx_product_listing_category_handles_gin` | Поддерживает category handle predicates для navigation scope/rule collections. Tag/feature GIN indexes намеренно не добавляются: storefront tag/feature path идет через token table. |

## `catalog.product_listing_price_index`

Одна строка на product + currency. Таблица хранит storefront price aggregates,
рассчитанные только по active in-stock variants.

```sql
CREATE TABLE catalog.product_listing_price_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,

  min_price_minor        bigint,
  max_price_minor        bigint,
  has_price              boolean NOT NULL DEFAULT false,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, product_id, currency),
  CONSTRAINT fk_product_listing_price_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and first key column for all joins. |
| `product_id` | Product whose in-stock variant prices are aggregated. |
| `currency` | ISO 4217 currency code. Storefront reads default currency row; rebuild can write all enabled project currencies. |
| `min_price_minor` | Lowest price among active in-stock variants with price in this currency. Nullable when `has_price = false`. |
| `max_price_minor` | Highest price among active in-stock variants with price in this currency. Nullable when `has_price = false`. |
| `has_price` | True if at least one active in-stock variant has price in this currency. Price filters/sorts use only `has_price = true` rows for priced subset. |
| `indexed_at` | Timestamp of index generation for this aggregate row. |
| `updated_at` | Timestamp of latest aggregate upsert. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (project_id, product_id, currency)` | Гарантирует одну aggregate price row на product/currency. |
| `fk_product_listing_price_product` | Удаляет price aggregate вместе с canonical product. |

### Индексы

```sql
CREATE INDEX idx_product_listing_price_visible_asc
  ON catalog.product_listing_price_index (
    project_id,
    currency,
    min_price_minor ASC,
    product_id
  )
  WHERE has_price = true;

CREATE INDEX idx_product_listing_price_visible_desc
  ON catalog.product_listing_price_index (
    project_id,
    currency,
    max_price_minor DESC,
    product_id
  )
  WHERE has_price = true;
```

| Индекс | Комментарий |
| --- | --- |
| `idx_product_listing_price_visible_asc` | Поддерживает product-aggregate `price_asc` для priced products в конкретной currency. Query все равно должен сохранить unpriced products с `NULLS LAST`. |
| `idx_product_listing_price_visible_desc` | Поддерживает product-aggregate `price_desc` по `max_price_minor`. Partial predicate исключает rows без цены. |

## `catalog.variant_listing_index`

Одна строка на active variant. Таблица хранит currency-neutral variant-level
predicates для option filtering, availability-aware matching и matched variant
sort.

```sql
CREATE TABLE catalog.variant_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,

  kind                   catalog.product_kind NOT NULL,
  variant_created_at     timestamptz NOT NULL,
  variant_updated_at     timestamptz NOT NULL,

  option_value_handles   text[] NOT NULL DEFAULT '{}'::text[],
  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, variant_id),
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

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and join prefix. |
| `product_id` | Parent product id. Нужен для grouping variants back to products. |
| `variant_id` | Canonical variant id. Anchor для same-variant OPTION + PRICE predicates. |
| `kind` | Product/variant kind для rule predicates и consistency with parent product. |
| `variant_created_at` | Canonical variant creation time for diagnostics/future sorts. |
| `variant_updated_at` | Canonical variant update time for sync freshness checks. |
| `option_value_handles` | Raw option handles в формате `option_slug:value_slug` для rebuild/debug. Storefront option path использует `variant_listing_facet_token`. |
| `in_stock` | Variant-level availability. Storefront option filters, price filters, option counts и matched price sort используют только `in_stock = true`. |
| `total_stock` | Variant stock aggregate for diagnostics and possible labels. |
| `indexed_at` | Время генерации variant listing row. |
| `updated_at` | Время последнего upsert variant listing row. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (project_id, variant_id)` | Гарантирует одну listing row на variant внутри project. |
| `fk_variant_listing_product` | Удаляет variant index rows при удалении parent product. |
| `fk_variant_listing_variant` | Не допускает orphan variant rows и удаляет index row при удалении canonical variant. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_project_product
  ON catalog.variant_listing_index (project_id, product_id);

CREATE INDEX idx_variant_listing_project_variant
  ON catalog.variant_listing_index (project_id, variant_id);

CREATE INDEX idx_variant_listing_in_stock
  ON catalog.variant_listing_index (project_id, in_stock);
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_project_product` | Быстрый переход от product candidate set к variants для variant filters, counts и aggregate refresh. |
| `idx_variant_listing_project_variant` | Lookup by variant id. PK уже покрывает этот порядок, поэтому можно не создавать дубликат, если он не нужен planner. |
| `idx_variant_listing_in_stock` | Поддерживает common predicate `vli.in_stock = true` для option/price matching и virtual in-stock count. |

## `catalog.variant_listing_price_index`

Одна строка на variant + currency. Таблица хранит price fields для price filter,
price range и matched variant price sort.

```sql
CREATE TABLE catalog.variant_listing_price_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,

  price_minor            bigint,
  has_price              boolean NOT NULL DEFAULT false,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, variant_id, currency),
  CONSTRAINT fk_variant_listing_price_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES catalog.product(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_price_variant
    FOREIGN KEY (project_id, product_id, variant_id)
    REFERENCES catalog.variant(project_id, product_id, id)
    ON DELETE CASCADE
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and first join key. |
| `product_id` | Parent product id, duplicated to support product grouping without extra join. |
| `variant_id` | Variant whose price is stored. Must be joined to the same `variant_listing_index.variant_id` when OPTION and PRICE predicates are both active. |
| `currency` | ISO 4217 currency code. Storefront listing uses project default currency. |
| `price_minor` | Variant price in minor currency units. Nullable if no price exists in this currency. |
| `has_price` | True when `price_minor` is usable for filters/sorts/ranges. If false, option filters may still match the variant, but price predicates exclude it. |
| `indexed_at` | Время генерации price row. |
| `updated_at` | Время последнего upsert price row. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (project_id, variant_id, currency)` | Гарантирует одну variant price row на currency. |
| `fk_variant_listing_price_product` | Каскадно удаляет price rows вместе с product. |
| `fk_variant_listing_price_variant` | Каскадно удаляет price rows вместе с variant и проверяет принадлежность variant product. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_price_product
  ON catalog.variant_listing_price_index (
    project_id,
    currency,
    product_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value
  ON catalog.variant_listing_price_index (project_id, currency, price_minor)
  WHERE has_price = true;
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_price_product` | Поддерживает matched variant price aggregation per product after candidate products are known. |
| `idx_variant_listing_price_value` | Поддерживает price range/filter scans по project + currency + price. |

## `catalog.product_listing_facet_token`

Одна строка на product + resolved storefront facet value. Это normalized
inverted index для product-level facets: `tag` и `feature`.

```sql
CREATE TABLE catalog.product_listing_facet_token (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  facet_id               uuid NOT NULL,
  facet_value_id         uuid NOT NULL,
  facet_type             varchar(16) NOT NULL,
  indexed_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, product_id, facet_id, facet_value_id),
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

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and first column in all lookup/count paths. |
| `product_id` | Product that owns this resolved facet token. |
| `facet_id` | Storefront configured facet id. Isolation/count logic работает по `facet_id`, не по `facet_type`. |
| `facet_value_id` | Storefront configured facet value id after resolving source handles through `facet_value_source_handle`. |
| `facet_type` | Denormalized type guard: only `tag` or `feature`. Useful for diagnostics and validation, not for isolation grouping. |
| `indexed_at` | Время генерации token rows for product. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (project_id, product_id, facet_id, facet_value_id)` | Deduplicates merged values: multiple source handles on one product resolving to the same `facet_value_id` count once. |
| `fk_product_listing_facet_token_product` | Удаляет product tokens вместе с product. |
| `fk_product_listing_facet_token_facet` | Удаляет tokens when configured facet is removed. |
| `fk_product_listing_facet_token_value` | Удаляет tokens when configured facet value is removed and enforces value ownership by facet. |
| `chk_product_listing_facet_token_type` | Prevents option/virtual facet tokens from entering product-level table. |

### Индексы

```sql
CREATE INDEX idx_product_listing_facet_token_count
  ON catalog.product_listing_facet_token (
    project_id,
    facet_id,
    facet_value_id,
    product_id
  );

CREATE INDEX idx_product_listing_facet_token_product
  ON catalog.product_listing_facet_token (
    project_id,
    product_id,
    facet_id,
    facet_value_id
  );
```

| Индекс | Комментарий |
| --- | --- |
| `idx_product_listing_facet_token_count` | Основной access path для product-level facet counts and candidate-first filtering by selected facet values. |
| `idx_product_listing_facet_token_product` | Быстрый lookup tokens by product during aggregation over scoped product set. PK уже имеет тот же порядок; при реализации можно опереться на PK вместо дубликата. |

## `catalog.variant_listing_facet_token`

Одна строка на variant + resolved storefront option value. Это normalized
inverted index для variant-level option facets. `variant_id` обязателен, чтобы
OPTION и PRICE predicates применялись к одному и тому же in-stock variant row.

```sql
CREATE TABLE catalog.variant_listing_facet_token (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
  facet_id               uuid NOT NULL,
  facet_value_id         uuid NOT NULL,
  indexed_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, variant_id, facet_id, facet_value_id),
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

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and first lookup/count key. |
| `product_id` | Parent product for grouping option matches back to product cardinality. |
| `variant_id` | Variant that owns the option value. Active option predicates must be anchored to this id. |
| `facet_id` | Storefront configured option facet id. Isolation is per `facet_id`. |
| `facet_value_id` | Storefront configured option value id after source-handle resolution. |
| `indexed_at` | Время генерации token rows for variant. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (project_id, variant_id, facet_id, facet_value_id)` | Deduplicates repeated source mappings on the same variant while preserving same-variant matching. |
| `fk_variant_listing_facet_token_product` | Удаляет option tokens вместе с product. |
| `fk_variant_listing_facet_token_variant` | Удаляет option tokens вместе с variant and validates product ownership. |
| `fk_variant_listing_facet_token_facet` | Удаляет tokens when configured option facet is removed. |
| `fk_variant_listing_facet_token_value` | Удаляет tokens when configured option value is removed and enforces value ownership by facet. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_facet_token_count
  ON catalog.variant_listing_facet_token (
    project_id,
    facet_id,
    facet_value_id,
    product_id,
    variant_id
  );

CREATE INDEX idx_variant_listing_facet_token_variant
  ON catalog.variant_listing_facet_token (
    project_id,
    variant_id,
    facet_id,
    facet_value_id
  );

CREATE INDEX idx_variant_listing_facet_token_product
  ON catalog.variant_listing_facet_token (
    project_id,
    product_id,
    facet_id,
    facet_value_id
  );
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_facet_token_count` | Основной access path для option counts/filtering by option value; включает product/variant для дедупликации и same-variant joins. |
| `idx_variant_listing_facet_token_variant` | Быстрый lookup option tokens for a specific variant while evaluating multiple active option predicates. PK уже покрывает тот же порядок. |
| `idx_variant_listing_facet_token_product` | Поддерживает aggregation over scoped product candidates and product-level grouping of variant option values. |

## Внешние ограничения canonical tables

Composite foreign keys listing tables include `project_id`, поэтому canonical
таблицы должны иметь matching unique keys. В текущих catalog models
`product_project_id_id_unique` и `variant_project_id_product_id_id_unique` уже
есть. Для facets нужно добавить или переиспользовать эквивалентные constraints,
если они появятся раньше в миграциях.

```sql
ALTER TABLE catalog.product
  ADD CONSTRAINT product_project_id_id_unique
  UNIQUE (project_id, id);

ALTER TABLE catalog.variant
  ADD CONSTRAINT variant_project_id_product_id_id_unique
  UNIQUE (project_id, product_id, id);

ALTER TABLE catalog.facet
  ADD CONSTRAINT facet_project_id_id_unique
  UNIQUE (project_id, id);

ALTER TABLE catalog.facet_value
  ADD CONSTRAINT facet_value_project_id_facet_id_id_unique
  UNIQUE (project_id, facet_id, id);
```

| Ограничение | Комментарий |
| --- | --- |
| `product_project_id_id_unique` | Required target for product listing composite FKs. Already present in current model. |
| `variant_project_id_product_id_id_unique` | Required target for variant listing composite FKs. Already present in current model. |
| `facet_project_id_id_unique` | Required target for token table FK to `catalog.facet(project_id, id)`. |
| `facet_value_project_id_facet_id_id_unique` | Required target for token table FK to `catalog.facet_value(project_id, facet_id, id)`. |

## Внешние индексы для listing queries

Listing index не заменяет canonical scope и locale sort indexes. Эти индексы
нужны для planned query shapes. Если existing migrations уже дают
эквивалентный access path, дубликаты создавать не нужно.

```sql
CREATE INDEX idx_product_category_listing_scope
  ON catalog.product_category (project_id, category_id, lexo_rank, product_id);

CREATE INDEX idx_collection_item_listing_scope
  ON catalog.collection_item (project_id, collection_id, lexo_rank, product_id);

CREATE INDEX idx_product_translation_listing_name
  ON catalog.product_translation (project_id, locale, name, product_id);
```

| Индекс | Комментарий |
| --- | --- |
| `idx_product_category_listing_scope` | Поддерживает category PLP scope и manual category order by `lexo_rank`. Текущий `idx_product_category_rank(category_id, lexo_rank)` не включает `project_id` и `product_id`, поэтому не полностью покрывает planned query. |
| `idx_collection_item_listing_scope` | Поддерживает manual collection PLP scope и order by `lexo_rank`. Текущий `idx_collection_item_rank(collection_id, lexo_rank)` не включает `project_id` и `product_id`. |
| `idx_product_translation_listing_name` | Поддерживает locale-dependent name sort without scanning all translations. Текущий `idx_product_translation_project_locale(project_id, locale)` не покрывает `ORDER BY name, product_id`. |

## Facet type routing

| `facet_type` | Storage/read path |
| --- | --- |
| `tag` | `product_listing_facet_token` |
| `feature` | `product_listing_facet_token` |
| `option` | `variant_listing_facet_token` |
| `price` | Virtual facet over `variant_listing_price_index.price_minor` and product price aggregates |
| `in_stock` | Virtual facet over `product_listing_index.in_stock` / `variant_listing_index.in_stock` |

`category` не добавляется в storefront facet types. Для navigation scope и
collection rules используются `category_handles` и canonical category scope
tables.
