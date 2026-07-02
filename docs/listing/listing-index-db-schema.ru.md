# Схема БД listing index

Документ фиксирует целевую PostgreSQL-схему read model для storefront listing:
выдача товаров, structured filtering, facet counts, total count, pagination и
sort. Нормативный источник требований:
`docs/listing/listing-index-redesign-plan.ru.md`.

Документ описывает текущую целевую read model. Обратная совместимость,
dual-write и compatibility views не требуются: после изменения listing index
пересобирается полным rebuild.

## Общие правила

- Все SQL read-model таблицы содержат `project_id`; каждый storefront/admin
  query должен ограничиваться текущим проектом. В таблицах, где строка
  идентифицируется canonical UUID (`product_id`, `variant_id`), `project_id`
  используется как query/index prefix, но не входит в PK/FK: canonical `id`
  считаются глобально уникальными внутри catalog schema.
- Исключение для posting snapshot tables: `project_id` входит в PK/FK вместе с
  `index_version`, потому что dense `product_doc_id` / `variant_doc_id` и
  `index_version` локальны внутри проекта и не являются canonical ids.
- Roaring/posting index создается сразу вместе с listing read model. Отдельные
  row-based product/variant facet posting tables не создаются: product
  tag/feature/category/vendor и variant option postings пишутся напрямую в
  `catalog.listing_posting_bitmap`.
- Runtime posting snapshot не хранит raw source-handle данные. Но он содержит
  rebuildable physical indexes для hot path: product sort rows и variant price
  rows. Это controlled duplication ради ordered access path; source of truth
  остается в SQL listing read model и canonical tables, а posting indexes можно
  удалить и восстановить полным rebuild.
- Основные listing таблицы и roaring posting tables currency-neutral. Денежные поля
  вынесены в отдельные per-currency таблицы.
- Storefront listing читает цену в default currency проекта.
- Soft-deleted products/variants не хранятся в listing index: строки должны
  удаляться каскадом или sync/rebuild script.
- Дочерние SQL таблицы внутри listing read model ссылаются на parent listing
  rows (`product_listing_index` / `variant_listing_index`), а не напрямую
  только на canonical tables. Это не дает price rows пережить partial
  sync/rebuild удаление parent row из read model. Posting rows удаляются
  каскадом по `listing_posting_index_version`.
- Storefront facets работают через resolved `facet_id` и `facet_value_id`, а не
  через raw source handles.
- `price` и `in_stock` являются virtual facets и не имеют строк в
  `catalog.listing_posting_bitmap`. Price hot path использует typed
  `catalog.listing_posting_variant_price`, а availability bucket хранится в
  `catalog.listing_posting_product_sort` для сортировок.
- Counts считаются по product cardinality. Variant-level facets сначала
  дедуплицируются до `(product_id, facet_id, facet_value_id)`.

## Устранение дублирования

Целевая схема разделяет данные по назначению:

- SQL listing read model хранит компактный currency-neutral snapshot товара и
  варианта, а также per-currency price rows. Это source/debug слой для rebuild,
  freshness checks и SQL fallback paths.
- Posting index хранит dense doc-id dictionaries, roaring bitmaps для resolved
  facet/scope predicates и производные physical indexes для sort/price hot
  paths. Он не повторяет raw tag/feature/category/option handles.
- Sort/price posting tables являются physical indexes, а не source data. Они
  строятся из `product_listing_index`, `product_listing_price_index`,
  `variant_listing_index`, `variant_listing_price_index`, translations и
  category/collection ranks. При расхождении truth находится в source tables,
  posting version считается stale и пересобирается.
- Raw source handles используются только во время rebuild/sync из canonical
  catalog tables и сразу резолвятся в stable ids (`facet_id`, `facet_value_id`,
  `category_id`, `collection_id`, `vendor_id`). После этого handles не нужны для
  storefront read path и не сохраняются в listing index.
- `project_id` намеренно повторяется во всех таблицах как tenant boundary и
  index prefix. Это не считается устранимым дублированием, потому что каждый
  storefront/admin query обязан явно ограничиваться проектом.

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
  - create `product_listing_index`, `product_listing_price_index`,
    `variant_listing_index`, `variant_listing_price_index` and the
    `catalog.listing_posting_*` roaring/posting tables;
  - add ordinary indexes from this document;
  - do not create raw-handle array columns;
  - create posting sort/price tables only as rebuildable physical indexes for
    runtime performance, not as canonical data;
  - do not add extra unique constraints on canonical `product`, `variant`,
    `facet`, `facet_value`, category or collection tables. Listing FKs reference
    existing product/variant primary keys by id; posting values use stable typed
    ids in `value_key`.
- `9004_read_models__product_bm25_search.sql`:
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

## `catalog.product_listing_index`

Одна строка на product. Таблица хранит visibility, product-level scalar
predicates, availability-агрегаты и стабильные поля сортировки. Price aggregates
вынесены в `catalog.product_listing_price_index`, а tag/feature/category scope
postings пишутся только в `catalog.listing_posting_bitmap`.

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

```

| Индекс | Комментарий |
| --- | --- |
| `idx_product_listing_project_product` | Явный lookup/join index по project + product. Нужен отдельно, потому что PK построен по `product_id`. |
| `idx_product_listing_visible_newest` | Покрывает default/newest storefront order: сначала in-stock, затем published date, затем created date и stable `product_id`. Partial predicate исключает drafts. |
| `idx_product_listing_visible_created` | Покрывает `created` sort с тем же availability bucket и stable tie-breaker. |
| `idx_product_listing_vendor` | Ускоряет explicit vendor filter. Partial predicate уменьшает размер, потому что products без vendor не участвуют в vendor lookup. |
| `idx_product_listing_in_stock` | Поддерживает availability toggle и in-stock virtual facet count на product aggregate. |

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

Одна строка на active variant. Таблица хранит только связь variant -> product и
currency-neutral availability aggregates. Option facet membership не
дублируется raw handles: rebuild/sync сразу пишет resolved variant facet
postings в `catalog.listing_posting_bitmap`.

```sql
CREATE TABLE catalog.variant_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,

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
| `fk_variant_listing_price_variant` | Привязывает price row к parent `variant_listing_index` и каскадно удаляет price rows при partial sync/rebuild удалении variant из read model. Product grouping выполняется join к parent row, чтобы не хранить `product_id` в price row. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_price_value
  ON catalog.variant_listing_price_index (project_id, currency, price_minor)
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_variant
  ON catalog.variant_listing_price_index (
    project_id,
    currency,
    variant_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value_variant
  ON catalog.variant_listing_price_index (
    project_id,
    currency,
    price_minor,
    variant_id
  )
  WHERE has_price = true;
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_price_value` | Поддерживает price range/filter scans по project + currency + price. |
| `idx_variant_listing_price_variant` | Поддерживает lookup priced variants after candidate variants are known; product grouping берется join к `variant_listing_index`, чтобы не хранить `product_id` второй раз. |
| `idx_variant_listing_price_value_variant` | Поддерживает price-range-first path, когда диапазон цены селективный: PostgreSQL может начать с `(project_id, currency, price_minor)` и сразу получить `variant_id` для дальнейшего same-variant matching. |

## Roaring posting index

Roaring posting index является целевым runtime index для storefront listing.
SQL read model (`product_listing_index`, `variant_listing_index` и price tables)
остается source/debug слой для rebuild и freshness checks. Storefront filtering,
totalCount и facet counts читают опубликованную posting version и выполняют set
operations над `roaringbitmap`.

Расширение создается в migration для posting index:

```sql
CREATE EXTENSION IF NOT EXISTS roaringbitmap;
```

Runtime code не должен вызывать raw extension operators напрямую. Query builder
использует project-owned wrapper names:

| Capability | Wrapper |
| --- | --- |
| Build bitmap aggregate | `listing_rb_build_agg(int)` |
| AND | `listing_rb_and(a, b)`, `listing_rb_and_many(...)` |
| OR | `listing_rb_or(a, b)` |
| Difference | `listing_rb_and_not(a, b)` |
| Cardinality | `listing_rb_cardinality(bitmap)` |
| Membership check | `listing_rb_contains(bitmap, doc_id)` |
| Iteration | `listing_rb_iterate(bitmap)` |

Exact SQL bodies для wrappers зависят от версии `pg_roaringbitmap` в target
PostgreSQL provider и должны быть проверены перед миграцией.

### `catalog.listing_posting_index_version`

Одна строка на project + posting index version. Published version атомарно
переключает storefront listing на новый snapshot.

```sql
CREATE TABLE catalog.listing_posting_index_version (
  project_id               uuid NOT NULL,
  index_version            bigint NOT NULL,
  status                   varchar(16) NOT NULL,
  product_doc_count        int NOT NULL,
  variant_doc_count        int NOT NULL,
  built_at                 timestamptz,
  published_at             timestamptz,
  source_listing_watermark timestamptz,
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (project_id, index_version),
  CONSTRAINT chk_listing_posting_index_version_status
    CHECK (status IN ('building', 'published', 'retired'))
);

CREATE UNIQUE INDEX ux_listing_posting_one_published
  ON catalog.listing_posting_index_version (project_id)
  WHERE status = 'published';
```

| Поле | Комментарий |
| --- | --- |
| `project_id` | Tenant boundary. Все doc ids и bitmaps принадлежат только этому project. |
| `index_version` | Monotonic snapshot id внутри project. |
| `status` | `building` rows не читаются storefront, `published` ровно один на project, `retired` ожидает cleanup. |
| `product_doc_count` | Количество product docs в версии; используется для diagnostics/planner thresholds. |
| `variant_doc_count` | Количество variant docs в версии. |
| `built_at` | Время завершения build rows для версии. |
| `published_at` | Время атомарной публикации. |
| `source_listing_watermark` | Watermark SQL listing read model, по которому построен snapshot. |
| `metadata` | Build parameters, extension version, thresholds и diagnostics. |

### `catalog.listing_posting_product_doc`

Dictionary между canonical product UUID и dense `product_doc_id` внутри
`(project_id, index_version)`.

```sql
CREATE TABLE catalog.listing_posting_product_doc (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,

  PRIMARY KEY (project_id, index_version, product_doc_id),
  UNIQUE (project_id, index_version, product_id),
  UNIQUE (project_id, index_version, product_doc_id, product_id),
  CONSTRAINT fk_listing_posting_product_doc_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE
);
```

| Поле | Комментарий |
| --- | --- |
| `product_doc_id` | Dense integer id для roaring product bitmaps. Не глобален и не переносится между projects/versions. |
| `product_id` | Canonical product id для hydration после page collection. |

### `catalog.listing_posting_variant_doc`

Dictionary между canonical variant UUID и dense `variant_doc_id` внутри версии,
с привязкой к parent `product_doc_id`.

```sql
CREATE TABLE catalog.listing_posting_variant_doc (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  variant_doc_id         int NOT NULL,
  variant_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,

  PRIMARY KEY (project_id, index_version, variant_doc_id),
  UNIQUE (project_id, index_version, variant_id),
  UNIQUE (
    project_id,
    index_version,
    variant_doc_id,
    product_doc_id,
    product_id
  ),
  CONSTRAINT fk_listing_posting_variant_doc_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE,
  CONSTRAINT fk_listing_posting_variant_doc_product
    FOREIGN KEY (project_id, index_version, product_doc_id, product_id)
    REFERENCES catalog.listing_posting_product_doc(
      project_id,
      index_version,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);
```

| Поле | Комментарий |
| --- | --- |
| `variant_doc_id` | Dense integer id для roaring variant bitmaps. |
| `variant_id` | Canonical variant id для diagnostics/hydration paths. |
| `product_doc_id` | Parent product doc id; нужен для projection variant bitmap -> product bitmap. |
| `product_id` | Parent canonical product id, duplicated as a version-local physical index value for price sort tie-breaks and validation. |

### `catalog.listing_posting_bitmap`

Physical roaring posting row for one `entity_type + field + value_key`.
Product tag/feature, option facets, category/collection scopes, vendor and
auxiliary posting sets live here.

```sql
CREATE TABLE catalog.listing_posting_bitmap (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  entity_type            varchar(16) NOT NULL,
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (project_id, index_version, entity_type, field, value_key),
  CONSTRAINT fk_listing_posting_bitmap_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE,
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
);
```

| Поле | Комментарий |
| --- | --- |
| `entity_type` | `product` bitmap stores `product_doc_id`; `variant` bitmap stores `variant_doc_id`. |
| `field` | Stable internal field name: `scope_category`, `scope_collection`, `vendor`, `facet`, `variant_product`, etc. |
| `value_key` | Stable typed value key. Use canonical ids or deterministic typed values, not mutable handles. |
| `bitmap` | Compressed roaringbitmap posting list. |
| `cardinality` | Must equal `listing_rb_cardinality(bitmap)`; used for planner choices and diagnostics. |
| `metadata` | Optional builder diagnostics, bucket metadata, facet hints. |

Recommended value keys:

```text
field=scope_category, value_key=<category_id>
field=scope_collection, value_key=<collection_id>
field=vendor, value_key=<vendor_id>
field=facet, value_key=<facet_id>:<facet_value_id>
field=variant_product, value_key=<product_doc_id>
```

### `catalog.listing_posting_product_sort`

Derived product sort rows for hot storefront page collectors. Это physical index,
а не canonical source data: rows строятся из SQL listing read model, translations
и manual scope tables при rebuild posting version.

```sql
CREATE TABLE catalog.listing_posting_product_sort (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  sort_kind              varchar(32) NOT NULL,
  locale                 varchar(16) NOT NULL DEFAULT '',
  currency               varchar(3) NOT NULL DEFAULT '',
  manual_scope_id        uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  bool_value             boolean,
  timestamptz_value      timestamptz,
  timestamptz_value_2    timestamptz,
  bigint_value           bigint,
  text_value             text,
  numeric_value          numeric,

  PRIMARY KEY (
    project_id,
    index_version,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  ),
  CONSTRAINT fk_listing_posting_product_sort_doc
    FOREIGN KEY (project_id, index_version, product_doc_id, product_id)
    REFERENCES catalog.listing_posting_product_doc(
      project_id,
      index_version,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_product_sort_newest
  ON catalog.listing_posting_product_sort (
    project_id,
    index_version,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    timestamptz_value DESC NULLS LAST,
    timestamptz_value_2 DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_value
  ON catalog.listing_posting_product_sort (
    project_id,
    index_version,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    numeric_value,
    text_value,
    bigint_value,
    product_id
  )
  INCLUDE (product_doc_id);
```

| Поле | Комментарий |
| --- | --- |
| `sort_kind` | `newest`, `created`, `name`, `manual`, `price_asc`, `price_desc`, etc. |
| `locale` | Locale-specific sort dimension; empty string for locale-neutral sorts. |
| `currency` | Currency-specific sort dimension; empty string for currency-neutral sorts. |
| `manual_scope_id` | Category/collection scope id for manual order; zero UUID for global sorts. |
| `bool_value` | Availability bucket. Hot storefront sorts populate it as `in_stock`. |
| `timestamptz_value`, `timestamptz_value_2` | Date sort values and stable fallback date. |
| `bigint_value` | Minor-unit or integer sort value when needed. |
| `text_value` | Locale text sort value, e.g. translated product name. |
| `numeric_value` | Generic numeric value for benchmark/diagnostic sort shapes. |

### `catalog.listing_posting_variant_price`

Derived typed price rows for range filtering and matched variant price sort.
Exact price values are not stored as one posting bitmap per price. Эта таблица
дублирует `variant_listing_price_index` в doc-id form осознанно: она дает
ordered scan by price without expanding variant bitmaps and joining UUID rows for
every page request.

```sql
CREATE TABLE catalog.listing_posting_variant_price (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  currency               varchar(3) NOT NULL,
  variant_doc_id         int NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  price_minor            bigint NOT NULL,

  PRIMARY KEY (project_id, index_version, currency, variant_doc_id),
  CONSTRAINT fk_listing_posting_variant_price_doc
    FOREIGN KEY (
      project_id,
      index_version,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    REFERENCES catalog.listing_posting_variant_doc(
      project_id,
      index_version,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_variant_price_range
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    product_id,
    price_minor,
    variant_doc_id,
    product_doc_id
  );
```

| Поле | Комментарий |
| --- | --- |
| `currency` | ISO 4217 currency. Storefront listing обычно читает default currency проекта. |
| `variant_doc_id` | Variant doc whose price participates in same-variant option+price matching. |
| `product_doc_id` | Parent product doc for product-level deduplication and membership checks. |
| `product_id` | Stable product tie-breaker and hydration key. |
| `price_minor` | Price in minor units. Rows exist only for priced variants. |

### `catalog.listing_posting_variant_projection_block`

Projection helper for `variant_doc_id` bitmap -> `product_doc_id` bitmap. Broad
option filters must not expand every variant through `listing_rb_iterate`.

```sql
CREATE TABLE catalog.listing_posting_variant_projection_block (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  block_id               int NOT NULL,
  variant_doc_from       int NOT NULL,
  variant_doc_to         int NOT NULL,
  variant_bitmap         roaringbitmap NOT NULL,
  product_bitmap         roaringbitmap NOT NULL,
  variant_count          int NOT NULL,
  product_count          int NOT NULL,

  PRIMARY KEY (project_id, index_version, block_id),
  CONSTRAINT fk_listing_posting_variant_projection_block_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE
);
```

| Поле | Комментарий |
| --- | --- |
| `block_id` | Stable sequential block number inside version. |
| `variant_doc_from`, `variant_doc_to` | Inclusive/exclusive dense doc id range for the block. |
| `variant_bitmap` | Bitmap of variants in this block. |
| `product_bitmap` | Product docs represented by all variants in this block. Exact only when the whole block matches. |
| `variant_count` | Cardinality of `variant_bitmap`. |
| `product_count` | Cardinality of `product_bitmap`. |

Recommended block size is 4096 or 8192 variant docs. If
`listing_rb_cardinality(block_match) = variant_count`, query can OR
`product_bitmap` directly. Partial block matches must map exact variants through
`listing_posting_variant_doc` and deduplicate product docs.

## Future segmented storage

Initial implementation uses full-snapshot posting tables above: rebuild writes a
new `(project_id, index_version)` snapshot and atomically publishes it. Segment
storage is intentionally not part of the current migration contract, because the
same storefront behavior can be delivered without duplicating every bitmap table
with a second segment table family.

If high-churn incremental refresh later requires immutable segments, add that in
a separate design/migration. Segment storage must preserve the same no-duplicate
rule: segment rows may shard bitmap/projection/sort/price physical indexes, but
must not introduce raw source handles or another source of truth outside the
rebuildable posting version.

## BM25 title search index

BM25 title search is a separate search candidate index. It narrows product
candidates by localized title and then joins back to listing/posting candidate
sets by `product_id` or `product_doc_id`.

### `catalog.product_title_bm25_search_index`

```sql
CREATE EXTENSION IF NOT EXISTS pg_search;

CREATE TABLE catalog.product_title_bm25_search_index (
  search_id              uuid NOT NULL,
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  locale                 varchar(8) NOT NULL,
  kind                   catalog.product_kind NOT NULL,
  status                 varchar(16) NOT NULL,
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  product_updated_at     timestamptz NOT NULL,
  product_revision       int NOT NULL DEFAULT 0,
  title                  text NOT NULL DEFAULT '',
  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_title_bm25_search_index_pkey
    PRIMARY KEY (product_id, locale),
  CONSTRAINT product_title_bm25_search_id_unique
    UNIQUE (search_id),
  CONSTRAINT fk_product_title_bm25_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.product(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_product_title_bm25_project_locale_product
  ON catalog.product_title_bm25_search_index (project_id, locale, product_id);

CREATE INDEX idx_product_title_bm25_visible
  ON catalog.product_title_bm25_search_index (
    project_id,
    locale,
    published_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_title_bm25_search
  ON catalog.product_title_bm25_search_index
  USING bm25 (
    search_id,
    project_id,
    locale,
    status,
    kind,
    product_id,
    title,
    published_at,
    product_created_at
  )
  WITH (key_field = 'search_id');
```

| Поле | Комментарий |
| --- | --- |
| `search_id` | Stable unique BM25 key field. |
| `project_id` | Tenant boundary for search candidate queries. |
| `product_id` | Canonical product id and FK target. |
| `locale` | Localized title dimension. |
| `kind`, `status`, `published_at` | Search-visible product predicates stored in the BM25 row. |
| `product_created_at`, `product_updated_at`, `product_revision` | Sort/debug/freshness fields from product snapshot. |
| `title` | Localized title indexed by BM25. |

## Внешние ограничения canonical tables

Listing read model не требует дополнительных canonical constraints. FK в
listing tables ссылаются на существующие primary keys canonical product/variant
tables:

```sql
catalog.product(id)
catalog.variant(id)
```

Facet/category/vendor ids хранятся в `listing_posting_bitmap.value_key` как
stable typed values без дополнительных FK constraints, чтобы snapshot можно было
атомарно пересобрать и удалить каскадом по posting version.

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
| `tag` | catalog.listing_posting_bitmap product facet postings |
| `feature` | catalog.listing_posting_bitmap product facet postings |
| `option` | catalog.listing_posting_bitmap variant facet postings |
| `price` | Virtual facet over `variant_listing_price_index.price_minor` and product price aggregates |
| `in_stock` | Virtual facet over `product_listing_index.in_stock` / `variant_listing_index.in_stock` |

`category` не добавляется в storefront facet types. Для navigation scope и
collection rules используются canonical category scope tables и
`catalog.listing_posting_bitmap` rows с `field = 'scope_category'`.
