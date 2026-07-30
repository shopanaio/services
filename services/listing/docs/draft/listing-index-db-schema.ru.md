# Схема БД listing index

> **LEGACY DRAFT:** документ не описывает universal variant-term cutover.
> Актуальный contract: `../listing-index-db-contract.ru.md`.

Документ фиксирует целевую PostgreSQL-схему read model для storefront listing:
выдача товаров, structured filtering, facet counts, total count, pagination и
sort. Нормативный источник runtime requirements:
`services/listing/docs/listing-posting-list-search-engine-index.ru.md`.
Верхнеуровневый redesign plan:
`services/listing/docs/listing-index-redesign-plan.ru.md`.

Документ описывает текущую целевую read model и runtime posting index для
incremental maintenance. Изменения товаров, вариантов, цен, остатков, facets и
scope membership должны обновлять только затронутые listing/posting rows.

## Общие правила

- Все SQL read-model таблицы содержат `store_id`; каждый storefront/admin
  query должен ограничиваться текущим проектом. `product_id` и `variant_id`
  являются external canonical ids из upstream product source, но listing schema
  не создает FK или type dependency на upstream schema. Child read-model rows
  дополнительно используют composite FK на parent listing rows
  (`store_id`, external id/doc id), чтобы повторяемый `store_id` не мог
  разойтись с parent row.
- `product_doc_id` / `variant_doc_id` являются стабильными runtime ids
  внутри проекта и хранятся прямо в `product_listing_index` /
  `variant_listing_index`. Они не переиспользуются после удаления canonical
  entity, чтобы старые bitmap memberships не начали указывать на другой товар
  или вариант.
- Roaring/posting index создается сразу вместе с listing read model. Отдельные
  row-based product/variant facet posting tables не создаются: product
  tag/feature/category/vendor и variant option postings пишутся напрямую в
  `listing.listing_posting_bitmap`.
- Runtime posting index не хранит raw source-handle данные. Но он содержит
  physical indexes для hot path: product sort rows и variant price rows. Это
  controlled duplication ради ordered access path; source of truth для
  storefront read path остается в SQL listing read model, а posting indexes
  поддерживаются incremental sync операциями.
- Основные listing таблицы и roaring posting tables currency-neutral. Денежные поля
  вынесены в отдельные per-currency таблицы.
- Storefront listing читает цену в default currency проекта.
- Soft-deleted products/variants не хранятся в listing index: строки должны
  удаляться каскадом или incremental sync script.
- Дочерние SQL таблицы внутри listing read model ссылаются только на parent
  listing rows (`product_listing_index` / `variant_listing_index`). Это не дает
  price/sort rows пережить sync удаление parent row из read model и сохраняет
  автономность `listing` schema.
- Storefront facets работают через resolved `facet_id` и `facet_value_id`, а не
  через raw source handles.
- `price` и `in_stock` являются virtual facets и не имеют строк в
  `listing.listing_posting_bitmap`. Price hot path использует typed
  `listing.listing_posting_variant_price`, а availability bucket хранится в
  `listing.listing_posting_product_sort` для сортировок.
- `listing.listing_posting_variant_price` хранит только priced active in-stock
  variants. Это делает price range и matched variant price sort same-variant и
  in-stock корректными без отдельного generic `in_stock` bitmap. При stock
  change sync обязан добавить или удалить affected variant price rows вместе с
  обновлением `variant_listing_index.in_stock`.
- Counts считаются по product cardinality. Variant-level facets сначала
  дедуплицируются до `(product_id, facet_id, facet_value_id)`.

## Устранение дублирования

Целевая схема разделяет данные по назначению:

- SQL listing read model хранит компактное currency-neutral состояние товара и
  варианта, stable integer doc ids, а также per-currency price rows. Это
  source/debug слой для freshness checks и SQL fallback paths.
- Posting index хранит roaring bitmaps для resolved facet/scope predicates и
  производные physical indexes для sort/price hot paths. Он использует stable
  doc ids из listing rows и не повторяет raw tag/feature/category/option
  handles.
- Sort/price posting tables являются physical indexes, а не source data. Они
  строятся из `product_listing_index`, `product_listing_price_index`,
  `variant_listing_index`, `variant_listing_price_index`, snapshot title data и
  category/collection ranks. При расхождении affected posting rows считаются
  stale и обновляются incremental sync.
- Raw source handles используются только во время sync из upstream indexing
  snapshot/command payload и сразу резолвятся в stable ids (`facet_id`,
  `facet_value_id`, `category_id`, `collection_id`, `vendor_id`). После этого
  handles не нужны для storefront read path и не сохраняются в listing index.
- `store_id` намеренно повторяется во всех таблицах как tenant boundary и
  index prefix. Это не считается устранимым дублированием, потому что каждый
  storefront/admin query обязан явно ограничиваться проектом.

## Миграции в `services/listing/migrations/domains`

Listing migrations are handwritten PostgreSQL SQL executed by the listing
`node-pg-migrate` runner. Do not use Drizzle migration generation for these
listing changes.

Place listing index migrations in a new listing service domain folder:

```text
services/listing/migrations/domains/0100_listing_index/
```

Planned files:

- `services/listing/migrations/domains/0100_listing_index/0100_listing_index__tables.sql`:
  - create `product_listing_index`, `product_listing_price_index`,
    `variant_listing_index`, `variant_listing_price_index`,
    `listing.listing_doc_id_allocator` and the `listing.listing_posting_*`
    roaring/posting tables;
  - add ordinary indexes from this document;
  - do not create raw-handle array columns;
  - create posting sort/price tables only as incremental physical indexes for
    runtime performance, not as upstream-owned data;
  - do not add constraints, indexes, types or FKs against upstream product
    source schemas. Listing stores external ids as values and posting values use
    stable typed ids in `value_key`;
  - add composite unique/FK targets only inside listing read-model tables where
    needed to enforce repeated `store_id` consistency in child rows.
- `services/listing/migrations/domains/0100_listing_index/0101_listing_index__bm25_search.sql`:
  - create `listing.product_title_bm25_search_index`;
  - create ordinary indexes and the ParadeDB BM25 index;
  - run `CREATE EXTENSION IF NOT EXISTS pg_search`, while keeping
    `shared_preload_libraries = 'pg_search'` as infrastructure configuration
    outside SQL migrations;
  - before finalizing the BM25 DDL, verify the selected `pg_search` version
    accepts `uuid`, `varchar` and `timestamptz` fields in `USING bm25`.
    If `uuid` is not accepted as `key_field`, replace `search_id uuid` with a
    stable unique `search_key text`. If non-text filter/sort fields are not
    accepted by the installed version, keep only supported fields in the BM25
    index and apply unsupported predicates in the SQL candidate query before
    joining the listing index.

If either basename is already taken when implementation starts, use the next
available `010x_listing_index__...sql` basename inside
`services/listing/migrations/domains/0100_listing_index/` and update these
documents in the same change. Keep basenames globally unique across all
`services/listing/migrations/domains/**/*.sql` files.

Do not edit existing historical domain migration files for this redesign. The
intended path for this work is additive handwritten SQL in listing service
`services/listing/migrations/domains/0100_listing_index/`.

Before implementation, update the current Drizzle listing models to this target
schema. The existing model layer may still contain legacy raw handle arrays and
row-based facet token tables; those are obsolete for this redesign and must not
be recreated by the handwritten migration.

## `listing.listing_doc_id_allocator`

Одна строка на project. Таблица хранит monotonic counters для stable doc ids.
Sync code выделяет ids под row-level lock (`SELECT ... FOR UPDATE`) и сразу
инкрементирует counter. Удаленные ids не переиспользуются.

```sql
CREATE TABLE listing.listing_doc_id_allocator (
  store_id              uuid NOT NULL,
  next_product_doc_id     int NOT NULL DEFAULT 1,
  next_variant_doc_id     int NOT NULL DEFAULT 1,
  updated_at              timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id),
  CONSTRAINT chk_listing_doc_id_allocator_product_positive
    CHECK (next_product_doc_id > 0),
  CONSTRAINT chk_listing_doc_id_allocator_variant_positive
    CHECK (next_variant_doc_id > 0)
);
```

| Поле | Комментарий |
| --- | --- |
| `store_id` | Tenant boundary для allocation state. |
| `next_product_doc_id` | Следующий product doc id для этого project. |
| `next_variant_doc_id` | Следующий variant doc id для этого project. |
| `updated_at` | Время последнего allocation update. |

## `listing.product_listing_index`

Одна строка на product. Таблица хранит visibility, product-level scalar
predicates, availability-агрегаты и стабильные поля сортировки. Price aggregates
вынесены в `listing.product_listing_price_index`, а tag/feature/category scope
postings пишутся только в `listing.listing_posting_bitmap`.

```sql
CREATE TABLE listing.product_listing_index (
  store_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,

  entity_type            varchar(16) NOT NULL,
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
  CONSTRAINT product_listing_store_doc_unique
    UNIQUE (store_id, product_doc_id),
  CONSTRAINT product_listing_store_product_unique
    UNIQUE (store_id, product_id),
  CONSTRAINT product_listing_store_doc_product_unique
    UNIQUE (store_id, product_doc_id, product_id),
  CONSTRAINT chk_product_listing_entity_type
    CHECK (entity_type IN ('product', 'bundle')),
  CONSTRAINT chk_product_listing_status
    CHECK (status IN ('published', 'draft')),
  CONSTRAINT chk_product_listing_doc_positive
    CHECK (product_doc_id > 0),
  CONSTRAINT chk_product_listing_total_stock_nonnegative
    CHECK (total_stock >= 0)
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `store_id` | Tenant/store boundary. Используется в index prefixes и во всех listing queries. Root identity остается `product_id`, а composite child FKs используют `store_id` только для consistency checks. |
| `product_id` | External canonical product id from upstream product source. Listing stores it as an opaque id and does not enforce an FK to upstream schema. |
| `product_doc_id` | Stable integer id товара внутри project для roaring product bitmaps. Выделяется один раз и не переиспользуется после удаления product. |
| `entity_type` | Тип sellable entity из indexing payload: `product` или `bundle`. |
| `vendor_id` | Vendor product-level filter. Это явный фильтр, не generic facet. |
| `handle` | Storefront handle published product. Используется для read model diagnostics и возможной hydration опоры, но не заменяет canonical product data. |
| `status` | Listing visibility state: `published` или `draft`. Published означает `published_at IS NOT NULL` и product не deleted. Deleted products должны удаляться из index. |
| `published_at` | Дата публикации для `newest` sort; nullable для draft rows. |
| `product_created_at` | Canonical product creation time для `created` sort и tie-break после `published_at`. |
| `product_updated_at` | Canonical product update time для diagnostics/sync freshness checks. |
| `product_revision` | Product revision на момент индексации; помогает skip/retry logic и отладке stale rows. |
| `in_stock` | Product-level availability aggregate: true, если есть sellable active in-stock variant. Всегда применяется перед пользовательской сортировкой. |
| `total_stock` | Currency-neutral суммарный stock по active variants. Используется для diagnostics и возможных availability labels. |
| `indexed_at` | Время создания строки index pipeline. |
| `updated_at` | Время последнего upsert строки listing index. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (product_id)` | Гарантирует одну listing строку на product и дает целевой ключ для joins. |
| `product_listing_store_doc_unique` | Гарантирует уникальность stable product doc id внутри project. |
| `product_listing_store_product_unique` | Дает composite FK target для child rows, чтобы `store_id` child row совпадал с parent listing row. |
| `product_listing_store_doc_product_unique` | Дает composite target для posting sort rows и variant parent consistency checks. |
| `chk_product_listing_kind` | Фиксирует локально поддерживаемые значения product kind без зависимости от upstream enum type. |
| `chk_product_listing_status` | Фиксирует допустимые visibility states; deleted не допускается как status. |
| `chk_product_listing_doc_positive` | Защищает roaring doc id domain от нулевых/отрицательных ids. |
| `chk_product_listing_total_stock_nonnegative` | Фиксирует, что aggregate stock не может быть отрицательным. |

### Индексы

```sql
CREATE INDEX idx_product_listing_store_product
  ON listing.product_listing_index (store_id, product_id);

CREATE INDEX idx_product_listing_store_doc
  ON listing.product_listing_index (store_id, product_doc_id);

CREATE INDEX idx_product_listing_visible_newest
  ON listing.product_listing_index (
    store_id,
    in_stock DESC,
    published_at DESC NULLS LAST,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_visible_created
  ON listing.product_listing_index (
    store_id,
    in_stock DESC,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_vendor
  ON listing.product_listing_index (store_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_product_listing_in_stock
  ON listing.product_listing_index (store_id, in_stock);

```

| Индекс | Комментарий |
| --- | --- |
| `idx_product_listing_store_product` | Явный lookup/join index по project + product. Нужен отдельно, потому что PK построен по `product_id`. |
| `idx_product_listing_store_doc` | Lookup/hydration по stable product doc id из roaring bitmaps. |
| `idx_product_listing_visible_newest` | Покрывает default/newest storefront order: сначала in-stock, затем published date, затем created date и stable `product_id`. Partial predicate исключает drafts. |
| `idx_product_listing_visible_created` | Покрывает `created` sort с тем же availability bucket и stable tie-breaker. |
| `idx_product_listing_vendor` | Ускоряет explicit vendor filter. Partial predicate уменьшает размер, потому что products без vendor не участвуют в vendor lookup. |
| `idx_product_listing_in_stock` | Поддерживает availability toggle и in-stock virtual facet count на product aggregate. |

## `listing.product_listing_price_index`

Одна строка на product + currency. Таблица хранит storefront price aggregates,
рассчитанные только по active in-stock variants.

```sql
CREATE TABLE listing.product_listing_price_index (
  store_id             uuid NOT NULL,
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
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_listing_price_store_product
    FOREIGN KEY (store_id, product_id)
    REFERENCES listing.product_listing_index(store_id, product_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_price_state
    CHECK (
      (
        has_price = false
        AND min_price_minor IS NULL
        AND max_price_minor IS NULL
      )
      OR (
        has_price = true
        AND min_price_minor IS NOT NULL
        AND max_price_minor IS NOT NULL
        AND min_price_minor >= 0
        AND max_price_minor >= min_price_minor
      )
    )
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `store_id` | Project boundary for filtering and index prefixes. |
| `product_id` | Product whose in-stock variant prices are aggregated. |
| `currency` | ISO 4217 currency code. Storefront reads default currency row; sync can write all enabled project currencies. |
| `min_price_minor` | Lowest price among active in-stock variants with price in this currency. Nullable when `has_price = false`. |
| `max_price_minor` | Highest price among active in-stock variants with price in this currency. Nullable when `has_price = false`. |
| `has_price` | True if at least one active in-stock variant has price in this currency. Price filters/sorts use only `has_price = true` rows for priced subset. |
| `indexed_at` | Timestamp of index generation for this aggregate row. |
| `updated_at` | Timestamp of latest aggregate upsert. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (product_id, currency)` | Гарантирует одну aggregate price row на product/currency. |
| `fk_product_listing_price_product` | Привязывает price aggregate к parent row в `product_listing_index` и удаляет его при partial sync удалении product из read model. |
| `fk_product_listing_price_store_product` | Защищает повторяемый `store_id` child row: он должен совпадать с parent listing row. |
| `chk_product_listing_price_state` | Запрещает inconsistent price rows: `has_price=false` хранит NULL price bounds, `has_price=true` требует non-negative min/max и `max >= min`. |

### Индексы

```sql
CREATE INDEX idx_product_listing_price_visible_asc
  ON listing.product_listing_price_index (
    store_id,
    currency,
    min_price_minor ASC,
    product_id
  )
  WHERE has_price = true;

CREATE INDEX idx_product_listing_price_visible_desc
  ON listing.product_listing_price_index (
    store_id,
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

## `listing.variant_listing_index`

Одна строка на active variant. Таблица хранит только связь variant -> product и
currency-neutral availability aggregates. Option facet membership не
дублируется raw handles: sync сразу пишет resolved variant facet
postings в `listing.listing_posting_bitmap`.

```sql
CREATE TABLE listing.variant_listing_index (
  store_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  variant_id             uuid NOT NULL,
  variant_doc_id         int NOT NULL,

  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id),
  CONSTRAINT variant_listing_store_product_variant_unique
    UNIQUE (product_id, variant_id),
  CONSTRAINT variant_listing_store_variant_unique
    UNIQUE (store_id, variant_id),
  CONSTRAINT variant_listing_store_doc_unique
    UNIQUE (store_id, variant_doc_id),
  CONSTRAINT variant_listing_store_doc_variant_unique
    UNIQUE (store_id, variant_doc_id, product_doc_id, product_id),
  CONSTRAINT fk_variant_listing_product
    FOREIGN KEY (product_id)
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_product_doc
    FOREIGN KEY (store_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      store_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE,
  CONSTRAINT chk_variant_listing_doc_positive
    CHECK (variant_doc_id > 0),
  CONSTRAINT chk_variant_listing_product_doc_positive
    CHECK (product_doc_id > 0),
  CONSTRAINT chk_variant_listing_total_stock_nonnegative
    CHECK (total_stock >= 0)
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `store_id` | Project boundary for filtering and join index prefixes. |
| `product_id` | Parent product id. Нужен для grouping variants back to products. |
| `product_doc_id` | Stable parent product doc id. Нужен для projection variant bitmap -> product bitmap и для price/sort hot paths без UUID lookup. |
| `variant_id` | External canonical variant id. Anchor для same-variant OPTION + PRICE predicates. Listing stores it as an opaque id and does not enforce an FK to upstream schema. |
| `variant_doc_id` | Stable integer id варианта внутри project для roaring variant bitmaps. Выделяется один раз и не переиспользуется после удаления variant. |
| `in_stock` | Variant-level availability. Storefront option filters, price filters, option counts и matched price sort используют только `in_stock = true`. |
| `total_stock` | Variant stock aggregate for diagnostics and possible labels. |
| `indexed_at` | Время генерации variant listing row. |
| `updated_at` | Время последнего upsert variant listing row. |

### Ограничения

| Ограничение | Комментарий |
| --- | --- |
| `PRIMARY KEY (variant_id)` | Гарантирует одну listing row на variant. |
| `variant_listing_store_product_variant_unique` | Дает уникальный ключ для product/variant pairing внутри read model. |
| `variant_listing_store_variant_unique` | Дает composite FK target для child rows, чтобы `store_id` child row совпадал с parent variant listing row. |
| `variant_listing_store_doc_unique` | Гарантирует уникальность stable variant doc id внутри project. |
| `variant_listing_store_doc_variant_unique` | Дает composite target для typed variant price rows и projection consistency checks. |
| `fk_variant_listing_product` | Привязывает variant listing row к parent `product_listing_index` и удаляет variant index rows при удалении product из read model. |
| `fk_variant_listing_product_doc` | Гарантирует, что `product_doc_id` действительно принадлежит parent product row. |
| `chk_variant_listing_doc_positive` | Защищает roaring variant doc id domain от нулевых/отрицательных ids. |
| `chk_variant_listing_product_doc_positive` | Защищает parent product doc id copy от нулевых/отрицательных ids. |
| `chk_variant_listing_total_stock_nonnegative` | Фиксирует, что aggregate stock не может быть отрицательным. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_store_product
  ON listing.variant_listing_index (store_id, product_id);

CREATE INDEX idx_variant_listing_store_variant
  ON listing.variant_listing_index (store_id, variant_id);

CREATE INDEX idx_variant_listing_store_doc
  ON listing.variant_listing_index (store_id, variant_doc_id);

CREATE INDEX idx_variant_listing_in_stock
  ON listing.variant_listing_index (store_id, in_stock);

CREATE INDEX idx_variant_listing_in_stock_product_variant
  ON listing.variant_listing_index (
    store_id,
    product_doc_id,
    product_id,
    variant_doc_id,
    variant_id
  )
  WHERE in_stock = true;
```

| Индекс | Комментарий |
| --- | --- |
| `idx_variant_listing_store_product` | Быстрый переход от product candidate set к variants для variant filters, counts и aggregate refresh. |
| `idx_variant_listing_store_variant` | Lookup by project + variant id. Нужен отдельно, потому что PK построен по `variant_id`. |
| `idx_variant_listing_store_doc` | Lookup/hydration по stable variant doc id из roaring bitmaps. |
| `idx_variant_listing_in_stock` | Поддерживает common predicate `vli.in_stock = true` для option/price matching и virtual in-stock count. |
| `idx_variant_listing_in_stock_product_variant` | Основной lookup для storefront option/price paths, где query уже имеет product candidate set и должен быстро перейти к in-stock variants конкретного product. Partial index уменьшает размер при большом числе out-of-stock variants. |

## `listing.variant_listing_price_index`

Одна строка на variant + currency. Таблица хранит price fields для price filter,
price range и matched variant price sort.

```sql
CREATE TABLE listing.variant_listing_price_index (
  store_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,

  price_minor            bigint,
  has_price              boolean NOT NULL DEFAULT false,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id, currency),
  CONSTRAINT fk_variant_listing_price_variant
    FOREIGN KEY (variant_id)
    REFERENCES listing.variant_listing_index(variant_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_price_store_variant
    FOREIGN KEY (store_id, variant_id)
    REFERENCES listing.variant_listing_index(store_id, variant_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_variant_listing_price_state
    CHECK (
      (
        has_price = false
        AND price_minor IS NULL
      )
      OR (
        has_price = true
        AND price_minor IS NOT NULL
        AND price_minor >= 0
      )
    )
);
```

### Поля

| Поле | Комментарий |
| --- | --- |
| `store_id` | Project boundary for filtering and index prefixes. |
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
| `fk_variant_listing_price_variant` | Привязывает price row к parent `variant_listing_index` и каскадно удаляет price rows при partial sync удалении variant из read model. Product grouping выполняется join к parent row, чтобы не хранить `product_id` в price row. |
| `fk_variant_listing_price_store_variant` | Защищает повторяемый `store_id` child row: он должен совпадать с parent variant listing row. |
| `chk_variant_listing_price_state` | Запрещает inconsistent price rows: `has_price=false` хранит NULL price, `has_price=true` требует non-negative `price_minor`. |

### Индексы

```sql
CREATE INDEX idx_variant_listing_price_value
  ON listing.variant_listing_price_index (store_id, currency, price_minor)
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_variant
  ON listing.variant_listing_price_index (
    store_id,
    currency,
    variant_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value_variant
  ON listing.variant_listing_price_index (
    store_id,
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
| `idx_variant_listing_price_value_variant` | Поддерживает price-range-first path, когда диапазон цены селективный: PostgreSQL может начать с `(store_id, currency, price_minor)` и сразу получить `variant_id` для дальнейшего same-variant matching. |

## Roaring posting index

Roaring posting index является целевым runtime index для storefront listing.
SQL read model (`product_listing_index`, `variant_listing_index` и price tables)
остается source/debug слой для freshness checks. Storefront filtering,
totalCount и facet counts читают current-state posting rows и выполняют set
operations над `roaringbitmap`.

Расширение создается в migration для posting index:

```sql
CREATE EXTENSION IF NOT EXISTS roaringbitmap;
```

Runtime code использует `pg_roaringbitmap` напрямую. Query builder использует extension API без промежуточных project-owned функций:

| Capability | Direct SQL |
| --- | --- |
| Build bitmap aggregate | `rb_build_agg(int)` |
| AND | `a & b`, `rb_and_agg(bitmap)` |
| OR | `a \| b`, `rb_or_agg(bitmap)` |
| Difference | `a - b` |
| Cardinality | `rb_cardinality(bitmap)` |
| Membership check | `bitmap @> doc_id` |
| Iteration | `rb_iterate(bitmap)` |

### Stable doc ids

Отдельные dictionary tables не создаются. Stable integer ids живут в
current-state listing rows:

```text
listing.product_listing_index(store_id, product_doc_id, product_id)
listing.variant_listing_index(store_id, variant_doc_id, product_doc_id, product_id, variant_id)
```

`product_doc_id` / `variant_doc_id` выделяются allocator-ом при создании
listing row. Удаленные ids не переиспользуются. Это позволяет incremental sync
обновлять roaring bitmaps in-place без пересоздания всего posting index.

### `listing.listing_posting_bitmap`

Physical roaring posting row for one `entity_type + field + value_key`.
Product tag/feature, option facets, category/collection scopes, vendor and
auxiliary posting sets live here.

```sql
CREATE TABLE listing.listing_posting_bitmap (
  store_id             uuid NOT NULL,
  entity_type            varchar(16) NOT NULL,
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, entity_type, field, value_key),
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
);
```

| Поле | Комментарий |
| --- | --- |
| `entity_type` | `product` bitmap stores `product_doc_id`; `variant` bitmap stores `variant_doc_id`. |
| `field` | Stable internal field name: `category`, `collection`, `vendor`, `facet`, `variant_product`, etc. |
| `value_key` | Stable typed value key. Use canonical ids or deterministic typed values, not mutable handles. |
| `bitmap` | Compressed roaringbitmap posting list. |
| `cardinality` | Must equal `rb_cardinality(bitmap)`; used for planner choices and diagnostics. |
| `metadata` | Optional builder diagnostics, bucket metadata, facet hints. |
| `updated_at` | Время последнего incremental обновления posting row. |

Recommended value keys:

```text
field=category, value_key=<category_id>
field=collection, value_key=<collection_id>
field=vendor, value_key=<vendor_id>
field=facet, value_key=<facet_id>:<facet_value_id>
field=variant_product, value_key=<product_doc_id>
```

### `listing.listing_posting_product_sort`

Derived product sort rows for hot storefront page collectors. Это physical index,
а не source data: rows строятся из SQL listing read model, snapshot title data
и snapshot manual scope ranks при incremental sync.

```sql
CREATE TABLE listing.listing_posting_product_sort (
  store_id             uuid NOT NULL,
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
    store_id,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  ),
  CONSTRAINT fk_listing_posting_product_sort_doc
    FOREIGN KEY (store_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      store_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_product_sort_newest
  ON listing.listing_posting_product_sort (
    store_id,
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

CREATE INDEX idx_listing_posting_product_sort_text
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    text_value ASC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_bigint_asc
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    bigint_value ASC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_bigint_desc
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    bigint_value DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);
```

Sort rows use sort-specific indexes because storefront ordering always starts
with the availability bucket. `idx_listing_posting_product_sort_text` serves
name/manual text ranks. `idx_listing_posting_product_sort_bigint_asc` and
`idx_listing_posting_product_sort_bigint_desc` serve product aggregate price and
other minor-unit integer sorts in both directions. Add a dedicated index when a
new `sort_kind` needs a different ordered value type or direction.

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

### `listing.listing_posting_variant_price`

Derived typed price rows for range filtering and matched variant price sort.
Exact price values are not stored as one posting bitmap per price. Эта таблица
дублирует `variant_listing_price_index` в doc-id form осознанно: она дает
ordered scan by price without expanding variant bitmaps and joining UUID rows for
every page request.

Rows exist only for variants that are both priced in `currency` and currently
in stock. `variant_listing_price_index` remains the per-currency source/debug
price row, including out-of-stock variants with price; this posting table is the
runtime ordered access path for storefront price filters and matched variant
price sort. When stock changes, sync must insert/delete affected rows here so a
price scan cannot return out-of-stock variants.

```sql
CREATE TABLE listing.listing_posting_variant_price (
  store_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,
  variant_doc_id         int NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  price_minor            bigint NOT NULL,

  PRIMARY KEY (store_id, currency, variant_doc_id),
  CONSTRAINT fk_listing_posting_variant_price_doc
    FOREIGN KEY (
      store_id,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    REFERENCES listing.variant_listing_index(
      store_id,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_variant_price_range
  ON listing.listing_posting_variant_price (
    store_id,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON listing.listing_posting_variant_price (
    store_id,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON listing.listing_posting_variant_price (
    store_id,
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
| `price_minor` | Price in minor units. Rows exist only for priced active in-stock variants. |

### `listing.listing_posting_variant_storeion_block`

Projection helper for `variant_doc_id` bitmap -> `product_doc_id` bitmap. Broad
option filters must not expand every variant through `rb_iterate`.

```sql
CREATE TABLE listing.listing_posting_variant_storeion_block (
  store_id             uuid NOT NULL,
  block_id               int NOT NULL,
  variant_doc_from       int NOT NULL,
  variant_doc_to         int NOT NULL,
  variant_bitmap         roaringbitmap NOT NULL,
  product_bitmap         roaringbitmap NOT NULL,
  variant_count          int NOT NULL,
  product_count          int NOT NULL,

  PRIMARY KEY (store_id, block_id),
  CONSTRAINT chk_listing_storeion_block_id_nonnegative
    CHECK (block_id >= 0),
  CONSTRAINT chk_listing_storeion_block_range
    CHECK (variant_doc_from >= 0 AND variant_doc_to > variant_doc_from),
  CONSTRAINT chk_listing_storeion_block_counts_nonnegative
    CHECK (variant_count >= 0 AND product_count >= 0)
);

CREATE INDEX idx_listing_storeion_block_range
  ON listing.listing_posting_variant_storeion_block (
    store_id,
    variant_doc_from,
    variant_doc_to
  );
```

| Поле | Комментарий |
| --- | --- |
| `block_id` | Stable sequential block number inside project. |
| `variant_doc_from`, `variant_doc_to` | Inclusive/exclusive variant doc id range for the block. |
| `variant_bitmap` | Bitmap of variants in this block. |
| `product_bitmap` | Product docs represented by all variants in this block. Exact only when the whole block matches. |
| `variant_count` | Cardinality of `variant_bitmap`. |
| `product_count` | Cardinality of `product_bitmap`. |

Recommended block size is 4096 or 8192 variant docs. If
`rb_cardinality(block_match) = variant_count`, query can OR
`product_bitmap` directly. Partial block matches must map exact variants through
`variant_listing_index` and deduplicate product docs.

The CHECK constraints only validate scalar shape. Freshness audit must verify
that `variant_count = rb_cardinality(variant_bitmap)` and
`product_count = rb_cardinality(product_bitmap)`.

## Incremental maintenance

Posting tables above are current-state physical indexes. Sync code updates only
affected rows:

- Product created: allocate stable `product_doc_id`, insert
  `product_listing_index`, product price rows, product sort rows and affected
  product posting bitmap memberships.
- Variant created: allocate stable `variant_doc_id`, insert
  `variant_listing_index`, variant price rows and affected variant posting
  bitmap memberships.
- Product/variant deleted or soft-deleted: remove its doc ids from affected
  bitmaps, delete listing rows and let dependent price/sort rows cascade where
  FK exists.
- Facet/scope/vendor changed: remove doc id from old posting rows and add it to
  new posting rows, updating `cardinality` and `updated_at`.
- Price changed: update source listing price rows, product price aggregates,
  affected `listing_posting_variant_price` rows for in-stock variants and price
  sort rows.
- Stock changed: update source listing availability rows, product aggregates,
  availability sort rows and insert/delete affected `listing_posting_variant_price`
  rows because that physical index contains only in-stock priced variants.
- Name/manual rank changed: update source listing rows and the affected physical
  sort rows.

If high-churn incremental refresh later needs immutable segments or batched
compaction, add that in a separate design/migration. Segment storage must
preserve the same no-duplicate rule: segment rows may shard bitmap/projection,
sort and price physical indexes, but must not introduce raw source handles or
another source of truth outside the current listing read model.

## BM25 title search index

BM25 title search is a separate search candidate index. It narrows product
candidates by localized title and then joins back to listing/posting candidate
sets by `product_id` or `product_doc_id`.

### `listing.product_title_bm25_search_index`

```sql
CREATE EXTENSION IF NOT EXISTS pg_search;

CREATE TABLE listing.product_title_bm25_search_index (
  search_id              uuid NOT NULL,
  store_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  locale                 varchar(8) NOT NULL,
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
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_title_bm25_status
    CHECK (status IN ('published', 'draft'))
);

CREATE INDEX idx_product_title_bm25_store_locale_product
  ON listing.product_title_bm25_search_index (store_id, locale, product_id);

CREATE INDEX idx_product_title_bm25_visible
  ON listing.product_title_bm25_search_index (
    store_id,
    locale,
    published_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_title_bm25_search
  ON listing.product_title_bm25_search_index
  USING bm25 (
    search_id,
    store_id,
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

Compatibility precondition:

ParadeDB documentation for v0.24.1 says BM25 indexes support most PostgreSQL
types, including text, JSON, numeric, timestamp, range, boolean and arrays, and
requires `key_field` to be unique, first in the indexed column list and
untokenized if it is text. It does not explicitly guarantee every planned field
shape used above, especially `uuid` as the key field and `timestamptz` fields.
Implementation must verify the exact installed `pg_search` version before
shipping
`services/listing/migrations/domains/0100_listing_index/0101_listing_index__bm25_search.sql`.

Fallback rules:

- If `uuid` cannot be used as the BM25 key field, change `search_id uuid` to a
  deterministic/stable unique `search_key text`, keep it first in `USING bm25`
  and set `WITH (key_field = 'search_key')`.
- If `uuid`, `varchar` or `timestamptz` columns cannot be included in the
  BM25 index for the selected version, index only the supported key/text fields
  required for title search. Apply project, locale, status, kind and date
  predicates in the SQL candidate relation before joining
  `product_listing_index`.
- Do not silently fall back to `ILIKE`; missing or incompatible `pg_search`
  should fail migration/startup clearly.

| Поле | Комментарий |
| --- | --- |
| `search_id` | Stable unique BM25 key field. |
| `store_id` | Tenant boundary for search candidate queries. |
| `product_id` | External canonical product id. FK points only to local `listing.product_listing_index(product_id)`, not to upstream product schema. |
| `locale` | Localized title dimension. |
| `kind`, `status`, `published_at` | Search-visible product predicates stored in the BM25 row. |
| `product_created_at`, `product_updated_at`, `product_revision` | Sort/debug/freshness fields from product listing state. |
| `title` | Localized title indexed by BM25. |

## Upstream schema independence

Listing schema intentionally has no FK, enum, index or migration dependency on
upstream product source schemas. `product_id`, `variant_id`, `vendor_id`,
category ids, collection ids, `facet_id` and `facet_value_id` are stored as
external stable ids received through indexing snapshots/commands.

Facet/category/vendor ids хранятся в `listing_posting_bitmap.value_key` как
stable typed values без дополнительных FK constraints, чтобы affected posting
rows можно было обновлять независимо от upstream configuration rows.

`store_id` в listing tables остается обязательным query boundary и должен
проверяться storefront/admin queries. Child rows внутри listing read model
используют composite parent FKs с `store_id`, чтобы повторяемый tenant
boundary не мог расходиться с parent listing row.

Any upstream indexes required to produce listing snapshots belong to the
upstream source service. Listing migrations must not create or modify objects
outside the `listing` schema.

## Facet type routing

| `facet_type` | Storage/read path |
| --- | --- |
| `tag` | listing.listing_posting_bitmap product facet postings |
| `feature` | listing.listing_posting_bitmap product facet postings |
| `option` | listing.listing_posting_bitmap variant facet postings |
| `price` | Virtual facet over runtime `listing.listing_posting_variant_price` and product price aggregates; `variant_listing_price_index` remains source/debug price row |
| `in_stock` | Virtual facet over `product_listing_index.in_stock` / `variant_listing_index.in_stock` |

`category` не добавляется в storefront facet types. Для navigation scope и
collection rules listing uses snapshot-provided category/collection memberships
and `listing.listing_posting_bitmap` rows с `field = 'category'`.
