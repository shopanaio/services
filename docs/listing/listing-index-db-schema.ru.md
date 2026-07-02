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

- Все таблицы содержат `project_id`; каждый storefront/admin query должен
  ограничиваться текущим проектом. `project_id` используется как query/index
  prefix, но не входит в PK/FK read model: canonical `id` считаются глобально
  уникальными внутри catalog schema.
- Основные listing таблицы и token tables currency-neutral. Денежные поля
  вынесены в отдельные per-currency таблицы.
- Storefront listing читает цену в default currency проекта.
- Soft-deleted products/variants не хранятся в listing index: строки должны
  удаляться каскадом или sync/rebuild script.
- Дочерние таблицы внутри listing read model ссылаются на parent listing rows
  (`product_listing_index` / `variant_listing_index`), а не напрямую только на
  canonical tables. Это не дает price/token rows пережить partial sync/rebuild
  удаление parent row из read model.
- Storefront facets работают через resolved `facet_id` и `facet_value_id`, а не
  через raw source handles.
- `price` и `in_stock` являются virtual facets и не имеют строк в token tables.
- Counts считаются по product cardinality. Variant-level facets сначала
  дедуплицируются до `(product_id, facet_id, facet_value_id)`.

## Миграции в `services/catalog/migrations/domains`

Catalog migrations are handwritten PostgreSQL SQL executed by the catalog
`node-pg-migrate` runner. Do not use Drizzle migration generation for these
listing changes.

Place listing read-model migrations in the existing read-model domain folder:

```text
services/catalog/migrations/domains/9000_read_models/
```

Planned files:

- `9003_read_models__listing_index_redesign.sql`:
  - drop legacy `catalog.product_search_index` and
    `catalog.variant_search_index`;
  - create `product_listing_index`, `product_listing_price_index`,
    `variant_listing_index`, `variant_listing_price_index`,
    `product_listing_facet_token` and `variant_listing_facet_token`;
  - add ordinary indexes from this document;
  - do not add extra unique constraints on canonical `product`,
    `variant`, `facet` or `facet_value`; listing FKs reference canonical primary
    keys by id.
- `9004_read_models__product_title_bm25_search.sql`:
  - create `catalog.product_title_bm25_search_index`;
  - create ordinary indexes and the ParadeDB BM25 index;
  - run `CREATE EXTENSION IF NOT EXISTS pg_search`, while keeping
    `shared_preload_libraries = 'pg_search'` as infrastructure configuration
    outside SQL migrations.

If either basename is already taken when implementation starts, use the next
available `900x_read_models__...sql` basename and update these documents in the
same change. Keep basenames globally unique across all
`services/catalog/migrations/domains/**/*.sql` files.

Do not edit existing historical domain migration files for this redesign unless
the implementation explicitly chooses a full catalog cutover and updates the
plan first. The intended path for this work is additive handwritten SQL in
`9000_read_models`.

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

  PRIMARY KEY (product_id),
  CONSTRAINT fk_product_listing_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.product(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_status
    CHECK (status IN ('published', 'draft'))
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Tenant/project boundary. Используется в index prefixes и во всех listing queries, но не входит в PK/FK. |
| `product_id` | Canonical product id из `catalog.product.id`. Так как product id глобально уникален, он идентифицирует строку read model. |
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
| `PRIMARY KEY (product_id)` | Гарантирует одну listing строку на product и дает целевой ключ для joins. |
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
| `idx_product_listing_project_product` | Явный lookup/join index по project + product. Нужен отдельно, потому что PK построен по `product_id`. |
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

  PRIMARY KEY (product_id, currency),
  CONSTRAINT fk_product_listing_price_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.product_listing_index(product_id)
    ON DELETE CASCADE
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary for filtering and index prefixes. |
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
| `PRIMARY KEY (product_id, currency)` | Гарантирует одну aggregate price row на product/currency. |
| `fk_product_listing_price_product` | Привязывает price aggregate к parent row в `product_listing_index` и удаляет его при partial sync/rebuild удалении product из read model. |

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

  PRIMARY KEY (variant_id),
  CONSTRAINT variant_listing_project_product_variant_unique
    UNIQUE (product_id, variant_id),
  CONSTRAINT fk_variant_listing_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_variant
    FOREIGN KEY (variant_id)
    REFERENCES catalog.variant(id)
    ON DELETE CASCADE
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary for filtering and join index prefixes. |
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
| `PRIMARY KEY (variant_id)` | Гарантирует одну listing row на variant. |
| `variant_listing_project_product_variant_unique` | Дает уникальный ключ для product/variant pairing внутри read model. |
| `fk_variant_listing_product` | Привязывает variant listing row к parent `product_listing_index` и удаляет variant index rows при удалении product из read model. |
| `fk_variant_listing_variant` | Не допускает orphan variant rows и удаляет index row при удалении canonical variant. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_project_product
  ON catalog.variant_listing_index (project_id, product_id);

CREATE INDEX idx_variant_listing_project_variant
  ON catalog.variant_listing_index (project_id, variant_id);

CREATE INDEX idx_variant_listing_in_stock
  ON catalog.variant_listing_index (project_id, in_stock);

CREATE INDEX idx_variant_listing_in_stock_product_variant
  ON catalog.variant_listing_index (project_id, product_id, variant_id)
  WHERE in_stock = true;
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_project_product` | Быстрый переход от product candidate set к variants для variant filters, counts и aggregate refresh. |
| `idx_variant_listing_project_variant` | Lookup by project + variant id. Нужен отдельно, потому что PK построен по `variant_id`. |
| `idx_variant_listing_in_stock` | Поддерживает common predicate `vli.in_stock = true` для option/price matching и virtual in-stock count. |
| `idx_variant_listing_in_stock_product_variant` | Основной lookup для storefront option/price paths, где query уже имеет product candidate set и должен быстро перейти к in-stock variants конкретного product. Partial index уменьшает размер при большом числе out-of-stock variants. |

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

  PRIMARY KEY (variant_id, currency),
  CONSTRAINT fk_variant_listing_price_variant
    FOREIGN KEY (variant_id)
    REFERENCES catalog.variant_listing_index(variant_id)
    ON DELETE CASCADE
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary for filtering and index prefixes. |
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
| `PRIMARY KEY (variant_id, currency)` | Гарантирует одну variant price row на currency. |
| `fk_variant_listing_price_variant` | Привязывает price row к parent `variant_listing_index`, каскадно удаляет price rows при partial sync/rebuild удалении variant из read model и проверяет принадлежность variant product. |

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

CREATE INDEX idx_variant_listing_price_product_variant
  ON catalog.variant_listing_price_index (
    project_id,
    currency,
    product_id,
    variant_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value_product_variant
  ON catalog.variant_listing_price_index (
    project_id,
    currency,
    price_minor,
    product_id,
    variant_id
  )
  WHERE has_price = true;
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_price_product` | Поддерживает matched variant price aggregation per product after candidate products are known. |
| `idx_variant_listing_price_value` | Поддерживает price range/filter scans по project + currency + price. |
| `idx_variant_listing_price_product_variant` | Поддерживает product-candidate-first path для active option filters: join от scoped products к variant prices с сохранением `variant_id` для same-variant option predicates и matched price aggregation. |
| `idx_variant_listing_price_value_product_variant` | Поддерживает price-range-first path, когда диапазон цены селективный: PostgreSQL может начать с `(project_id, currency, price_minor)` и сразу получить `product_id`/`variant_id` для дальнейшего same-variant matching. |

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

  PRIMARY KEY (product_id, facet_id, facet_value_id),
  CONSTRAINT fk_product_listing_facet_token_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_listing_facet_token_facet
    FOREIGN KEY (facet_id)
    REFERENCES catalog.facet(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_listing_facet_token_value
    FOREIGN KEY (facet_value_id)
    REFERENCES catalog.facet_value(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_facet_token_type
    CHECK (facet_type IN ('tag', 'feature'))
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and first column in lookup/count indexes. |
| `product_id` | Product that owns this resolved facet token. |
| `facet_id` | Storefront configured facet id. Isolation/count logic работает по `facet_id`, не по `facet_type`. |
| `facet_value_id` | Storefront configured visible facet value id after resolving raw source handles through the `facet_value.kind/source parent` model. |
| `facet_type` | Denormalized type guard: only `tag` or `feature`. Useful for diagnostics and validation, not for isolation grouping. |
| `indexed_at` | Время генерации token rows for product. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (product_id, facet_id, facet_value_id)` | Deduplicates merged values: multiple source handles on one product resolving to the same `facet_value_id` count once. |
| `fk_product_listing_facet_token_product` | Привязывает product tokens к parent `product_listing_index` и удаляет tokens при partial sync/rebuild удалении product из read model. |
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
| `idx_product_listing_facet_token_product` | Быстрый lookup tokens by project + product during aggregation over scoped product set. Нужен отдельно, потому что PK начинается с `product_id`. |

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

  PRIMARY KEY (variant_id, facet_id, facet_value_id),
  CONSTRAINT fk_variant_listing_facet_token_variant
    FOREIGN KEY (variant_id)
    REFERENCES catalog.variant_listing_index(variant_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_facet_token_facet
    FOREIGN KEY (facet_id)
    REFERENCES catalog.facet(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_facet_token_value
    FOREIGN KEY (facet_value_id)
    REFERENCES catalog.facet_value(id)
    ON DELETE CASCADE
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `project_id` | Project boundary and first lookup/count index column. |
| `product_id` | Parent product for grouping option matches back to product cardinality. |
| `variant_id` | Variant that owns the option value. Active option predicates must be anchored to this id. |
| `facet_id` | Storefront configured option facet id. Isolation is per `facet_id`. |
| `facet_value_id` | Storefront configured option value id after source-handle resolution. |
| `indexed_at` | Время генерации token rows for variant. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (variant_id, facet_id, facet_value_id)` | Deduplicates repeated source mappings on the same variant while preserving same-variant matching. |
| `fk_variant_listing_facet_token_variant` | Привязывает option tokens к parent `variant_listing_index`, удаляет tokens при partial sync/rebuild удалении variant из read model и проверяет принадлежность variant product. |
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
| `idx_variant_listing_facet_token_variant` | Быстрый lookup option tokens by project + variant while evaluating multiple active option predicates. Нужен отдельно, потому что PK начинается с `variant_id`. |
| `idx_variant_listing_facet_token_product` | Поддерживает aggregation over scoped product candidates and product-level grouping of variant option values. |

## Внешние ограничения canonical tables

Listing read model не требует дополнительных canonical constraints. FK в
listing tables ссылаются на существующие primary keys canonical tables:

```sql
catalog.product(id)
catalog.variant(id)
catalog.facet(id)
catalog.facet_value(id)
```

`project_id` в listing tables остается обязательным query boundary и должен
проверяться storefront/admin queries, но он не используется как FK target.

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
