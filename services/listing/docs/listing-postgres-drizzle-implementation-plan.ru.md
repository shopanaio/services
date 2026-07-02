# Implementation-ready план PostgreSQL/Drizzle слоя listing index

План ограничен созданием PostgreSQL schema/migrations и Drizzle model layer для
listing index. Репозитории, sync scripts, DBOS workflows, event handlers,
storefront query builders, GraphQL API и бизнес-логика в этот scope не входят.

## Прочитанные источники

- `AGENTS.md`
- `knowledge/AGENTS.md`
- `knowledge/vault/configuration/drizzle-config.md`
- `knowledge/vault/patterns/repository.md`
- `knowledge/vault/architecture/multi-tenancy.md`
- `knowledge/vault/packages/drizzle-query/index.md`
- `services/listing/docs/draft/listing-index-db-schema.ru.md`
- `services/listing/docs/draft/listing-posting-list-search-engine-index.ru.md`
- `services/listing/docs/draft/listing-bm25-pg-search-index-plan.ru.md`
- `services/listing/docs/draft/listing-query-sql-examples.ru.md`
- `services/listing/docs/draft/listing-index-redesign-plan.ru.md`
- `services/listing/docs/draft/listing-index-sync-freshness.ru.md`
- `services/listing/docs/draft/listing-index-sync-implementation-plan.ru.md`
- `services/listing/docs/draft/listing-facet-option-multi-source-filtering.ru.md`
- `services/listing/docs/draft/listing-storefront-operations-explained.ru.md`
- текущий listing foundation migration:
  `services/listing/migrations/domains/0000_foundation/0000_foundation__schema.sql`
- текущий listing Drizzle bootstrap:
  `services/listing/src/repositories/models/schema.ts`,
  `services/listing/src/repositories/models/index.ts`

## Scope

Включить:

- handwritten PostgreSQL migrations для всех listing read-model, posting и BM25
  объектов;
- PostgreSQL extensions, которые нужны этим объектам;
- все таблицы, constraints, foreign keys, checks и indexes из target schema;
- Drizzle table models, custom PostgreSQL type builder для `roaringbitmap`,
  exports и inferred select/insert types;
- документационные comments в model layer только там, где Drizzle не может
  выразить exact SQL index shape.

Не включать:

- repository classes and registration in `Repository.ts`;
- SQL query builders and raw SQL query methods;
- sync/freshness scripts;
- DBOS workflows;
- event subscribers;
- GraphQL schema/resolvers;
- changeset edits.

## Нормативные решения

1. Listing migrations остаются handwritten SQL через `node-pg-migrate`.
   Drizzle migration generation для listing index не использовать.
2. Migration runner already reads `services/listing/migrations/domains/**/*.sql`
   with `useGlob: true`, `migrationsSchema: "listing"` and
   `migrationsTable: "pgmigrations"`.
3. Все новые runtime объекты создаются только в schema `listing`.
4. Не создавать constraints, indexes, enum types или FKs на upstream schemas.
   `product_id`, `variant_id`, `vendor_id`, category/collection/facet ids are
   external stable ids stored as values.
5. Every table has `project_id` and every future query must scope by project.
6. `product_doc_id` and `variant_doc_id` are stable integer ids inside project.
   They are allocated once and never reused after canonical entity deletion.
7. Runtime posting index stores resolved ids only. Raw source handles, option
   handles, tag handles, feature handles and category handles must not appear in
   listing runtime tables.
8. No row-based product/variant facet token tables.
9. `price` and `in_stock` remain virtual facets. Do not create generic
   `listing_posting_bitmap(field = 'price')` or default generic in-stock bitmap
   rows.
10. Timestamps in Drizzle models use
    `timestamp(..., { withTimezone: true, mode: "string" })`.
11. Minor-unit money columns follow existing project convention and use
    PostgreSQL `bigint` with Drizzle `{ mode: "number" }`.
12. `numeric_value` is generic diagnostic/sort data and should use Drizzle
    `numeric(..., { mode: "string" })`.
13. BM25 requires infrastructure support:
    `shared_preload_libraries = 'pg_search'` is outside SQL migrations;
    migration only runs `CREATE EXTENSION IF NOT EXISTS pg_search`.
14. Missing `pg_search` must fail migration/startup clearly. Do not silently
    fall back to `ILIKE`.

## File plan

Create:

```text
services/listing/migrations/domains/0100_listing_index/
  0100_listing_index__tables.sql
  0101_listing_index__bm25_search.sql

services/listing/src/repositories/models/
  postgresTypes.ts
  listingIndex.ts
```

Update:

```text
services/listing/src/repositories/models/index.ts
```

Do not modify:

```text
services/listing/migrations/domains/0000_foundation/0000_foundation__schema.sql
changeset files
```

Before creating migration files, verify no basename conflict exists under
`services/listing/migrations/domains/**/*.sql`. If `0100_*` or `0101_*` is
already taken, use the next available `010x_listing_index__...sql` basename in
the same domain folder.

## PostgreSQL migration 0100: read model and roaring posting tables

File:

```text
services/listing/migrations/domains/0100_listing_index/0100_listing_index__tables.sql
```

DDL prelude:

```sql
CREATE SCHEMA IF NOT EXISTS listing;
CREATE EXTENSION IF NOT EXISTS roaringbitmap;
```

### `listing.listing_doc_id_allocator`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `next_product_doc_id` | `int` | `NOT NULL DEFAULT 1` |
| `next_variant_doc_id` | `int` | `NOT NULL DEFAULT 1` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `PRIMARY KEY (project_id)`
- `chk_listing_doc_id_allocator_product_positive`
  `CHECK (next_product_doc_id > 0)`
- `chk_listing_doc_id_allocator_variant_positive`
  `CHECK (next_variant_doc_id > 0)`

Indexes:

- primary key only.

### `listing.product_listing_index`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `product_id` | `uuid` | `NOT NULL` |
| `product_doc_id` | `int` | `NOT NULL` |
| `kind` | `varchar(16)` | `NOT NULL` |
| `vendor_id` | `uuid` | nullable |
| `handle` | `varchar(255)` | nullable |
| `status` | `varchar(16)` | `NOT NULL` |
| `published_at` | `timestamptz` | nullable |
| `product_created_at` | `timestamptz` | `NOT NULL` |
| `product_updated_at` | `timestamptz` | `NOT NULL` |
| `product_revision` | `int` | `NOT NULL DEFAULT 0` |
| `in_stock` | `boolean` | `NOT NULL DEFAULT false` |
| `total_stock` | `int` | `NOT NULL DEFAULT 0` |
| `indexed_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `PRIMARY KEY (product_id)`
- `product_listing_project_doc_unique`
  `UNIQUE (project_id, product_doc_id)`
- `product_listing_project_product_unique`
  `UNIQUE (project_id, product_id)`
- `product_listing_project_doc_product_unique`
  `UNIQUE (project_id, product_doc_id, product_id)`
- `chk_product_listing_kind`
  `CHECK (kind IN ('BASE', 'BUNDLE'))`
- `chk_product_listing_status`
  `CHECK (status IN ('published', 'draft'))`
- `chk_product_listing_doc_positive`
  `CHECK (product_doc_id > 0)`
- `chk_product_listing_total_stock_nonnegative`
  `CHECK (total_stock >= 0)`

Indexes:

```sql
CREATE INDEX idx_product_listing_project_product
  ON listing.product_listing_index (project_id, product_id);

CREATE INDEX idx_product_listing_project_doc
  ON listing.product_listing_index (project_id, product_doc_id);

CREATE INDEX idx_product_listing_visible_newest
  ON listing.product_listing_index (
    project_id,
    in_stock DESC,
    published_at DESC NULLS LAST,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_visible_created
  ON listing.product_listing_index (
    project_id,
    in_stock DESC,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_vendor
  ON listing.product_listing_index (project_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_product_listing_in_stock
  ON listing.product_listing_index (project_id, in_stock);
```

### `listing.product_listing_price_index`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `product_id` | `uuid` | `NOT NULL` |
| `currency` | `varchar(3)` | `NOT NULL` |
| `min_price_minor` | `bigint` | nullable |
| `max_price_minor` | `bigint` | nullable |
| `has_price` | `boolean` | `NOT NULL DEFAULT false` |
| `indexed_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `PRIMARY KEY (product_id, currency)`
- `fk_product_listing_price_product`
  `FOREIGN KEY (product_id) REFERENCES listing.product_listing_index(product_id)
  ON DELETE CASCADE`
- `fk_product_listing_price_project_product`
  `FOREIGN KEY (project_id, product_id) REFERENCES
  listing.product_listing_index(project_id, product_id) ON DELETE CASCADE`
- `chk_product_listing_price_state`
  enforces either `has_price = false` with null bounds or `has_price = true`
  with non-null non-negative bounds and `max_price_minor >= min_price_minor`.

Indexes:

```sql
CREATE INDEX idx_product_listing_price_visible_asc
  ON listing.product_listing_price_index (
    project_id,
    currency,
    min_price_minor ASC,
    product_id
  )
  WHERE has_price = true;

CREATE INDEX idx_product_listing_price_visible_desc
  ON listing.product_listing_price_index (
    project_id,
    currency,
    max_price_minor DESC,
    product_id
  )
  WHERE has_price = true;
```

### `listing.variant_listing_index`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `product_id` | `uuid` | `NOT NULL` |
| `product_doc_id` | `int` | `NOT NULL` |
| `variant_id` | `uuid` | `NOT NULL` |
| `variant_doc_id` | `int` | `NOT NULL` |
| `in_stock` | `boolean` | `NOT NULL DEFAULT false` |
| `total_stock` | `int` | `NOT NULL DEFAULT 0` |
| `indexed_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `PRIMARY KEY (variant_id)`
- `variant_listing_project_product_variant_unique`
  `UNIQUE (product_id, variant_id)`
- `variant_listing_project_variant_unique`
  `UNIQUE (project_id, variant_id)`
- `variant_listing_project_doc_unique`
  `UNIQUE (project_id, variant_doc_id)`
- `variant_listing_project_doc_variant_unique`
  `UNIQUE (project_id, variant_doc_id, product_doc_id, product_id)`
- `fk_variant_listing_product`
  `FOREIGN KEY (product_id) REFERENCES
  listing.product_listing_index(product_id) ON DELETE CASCADE`
- `fk_variant_listing_product_doc`
  `FOREIGN KEY (project_id, product_doc_id, product_id) REFERENCES
  listing.product_listing_index(project_id, product_doc_id, product_id)
  ON DELETE CASCADE`
- `chk_variant_listing_doc_positive`
  `CHECK (variant_doc_id > 0)`
- `chk_variant_listing_product_doc_positive`
  `CHECK (product_doc_id > 0)`
- `chk_variant_listing_total_stock_nonnegative`
  `CHECK (total_stock >= 0)`

Indexes:

```sql
CREATE INDEX idx_variant_listing_project_product
  ON listing.variant_listing_index (project_id, product_id);

CREATE INDEX idx_variant_listing_project_variant
  ON listing.variant_listing_index (project_id, variant_id);

CREATE INDEX idx_variant_listing_project_doc
  ON listing.variant_listing_index (project_id, variant_doc_id);

CREATE INDEX idx_variant_listing_in_stock
  ON listing.variant_listing_index (project_id, in_stock);

CREATE INDEX idx_variant_listing_in_stock_product_variant
  ON listing.variant_listing_index (
    project_id,
    product_doc_id,
    product_id,
    variant_doc_id,
    variant_id
  )
  WHERE in_stock = true;
```

### `listing.variant_listing_price_index`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `variant_id` | `uuid` | `NOT NULL` |
| `currency` | `varchar(3)` | `NOT NULL` |
| `price_minor` | `bigint` | nullable |
| `has_price` | `boolean` | `NOT NULL DEFAULT false` |
| `indexed_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `PRIMARY KEY (variant_id, currency)`
- `fk_variant_listing_price_variant`
  `FOREIGN KEY (variant_id) REFERENCES
  listing.variant_listing_index(variant_id) ON DELETE CASCADE`
- `fk_variant_listing_price_project_variant`
  `FOREIGN KEY (project_id, variant_id) REFERENCES
  listing.variant_listing_index(project_id, variant_id) ON DELETE CASCADE`
- `chk_variant_listing_price_state`
  enforces either `has_price = false AND price_minor IS NULL` or
  `has_price = true AND price_minor IS NOT NULL AND price_minor >= 0`.

Indexes:

```sql
CREATE INDEX idx_variant_listing_price_value
  ON listing.variant_listing_price_index (project_id, currency, price_minor)
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_variant
  ON listing.variant_listing_price_index (
    project_id,
    currency,
    variant_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value_variant
  ON listing.variant_listing_price_index (
    project_id,
    currency,
    price_minor,
    variant_id
  )
  WHERE has_price = true;
```

### `listing.listing_posting_bitmap`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `entity_type` | `varchar(16)` | `NOT NULL` |
| `field` | `varchar(64)` | `NOT NULL` |
| `value_key` | `text` | `NOT NULL` |
| `bitmap` | `roaringbitmap` | `NOT NULL` |
| `cardinality` | `bigint` | `NOT NULL` |
| `metadata` | `jsonb` | `NOT NULL DEFAULT '{}'::jsonb` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `PRIMARY KEY (project_id, entity_type, field, value_key)`
- `chk_listing_posting_bitmap_entity_type`
  `CHECK (entity_type IN ('product', 'variant'))`

Indexes:

- primary key only.

Value-key contract:

```text
field=category, value_key=<category_id>
field=collection, value_key=<collection_id>
field=vendor, value_key=<vendor_id>
field=facet, value_key=<facet_id>:<facet_value_id>
field=variant_product, value_key=<product_doc_id>
```

### `listing.listing_posting_product_sort`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `product_doc_id` | `int` | `NOT NULL` |
| `product_id` | `uuid` | `NOT NULL` |
| `sort_kind` | `varchar(32)` | `NOT NULL` |
| `locale` | `varchar(16)` | `NOT NULL DEFAULT ''` |
| `currency` | `varchar(3)` | `NOT NULL DEFAULT ''` |
| `manual_scope_id` | `uuid` | `NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid` |
| `bool_value` | `boolean` | nullable |
| `timestamptz_value` | `timestamptz` | nullable |
| `timestamptz_value_2` | `timestamptz` | nullable |
| `bigint_value` | `bigint` | nullable |
| `text_value` | `text` | nullable |
| `numeric_value` | `numeric` | nullable |

Constraints:

- `PRIMARY KEY (project_id, product_doc_id, sort_kind, locale, currency,
  manual_scope_id)`
- `fk_listing_posting_product_sort_doc`
  `FOREIGN KEY (project_id, product_doc_id, product_id) REFERENCES
  listing.product_listing_index(project_id, product_doc_id, product_id)
  ON DELETE CASCADE`

Indexes:

```sql
CREATE INDEX idx_listing_posting_product_sort_newest
  ON listing.listing_posting_product_sort (
    project_id,
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
    project_id,
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
    project_id,
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
    project_id,
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

Drizzle note: current Drizzle index builder supports order, nulls and custom
index methods, but not PostgreSQL `INCLUDE`. Keep these exact `INCLUDE` indexes
in handwritten SQL as the source of truth. The Drizzle model can either omit
these indexes or model the leading ordered columns with a code comment that
`INCLUDE (product_doc_id)` exists only in migration SQL.

### `listing.listing_posting_variant_price`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `currency` | `varchar(3)` | `NOT NULL` |
| `variant_doc_id` | `int` | `NOT NULL` |
| `product_doc_id` | `int` | `NOT NULL` |
| `product_id` | `uuid` | `NOT NULL` |
| `price_minor` | `bigint` | `NOT NULL` |

Constraints:

- `PRIMARY KEY (project_id, currency, variant_doc_id)`
- `fk_listing_posting_variant_price_doc`
  `FOREIGN KEY (project_id, variant_doc_id, product_doc_id, product_id)
  REFERENCES listing.variant_listing_index(project_id, variant_doc_id,
  product_doc_id, product_id) ON DELETE CASCADE`

Indexes:

```sql
CREATE INDEX idx_listing_posting_variant_price_range
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    product_id,
    price_minor,
    variant_doc_id,
    product_doc_id
  );
```

Runtime invariant for later logic: rows exist only for priced active in-stock
variants. The database schema enforces shape, not this source invariant.

### `listing.listing_posting_variant_projection_block`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `project_id` | `uuid` | `NOT NULL` |
| `block_id` | `int` | `NOT NULL` |
| `variant_doc_from` | `int` | `NOT NULL` |
| `variant_doc_to` | `int` | `NOT NULL` |
| `variant_bitmap` | `roaringbitmap` | `NOT NULL` |
| `product_bitmap` | `roaringbitmap` | `NOT NULL` |
| `variant_count` | `int` | `NOT NULL` |
| `product_count` | `int` | `NOT NULL` |

Constraints:

- `PRIMARY KEY (project_id, block_id)`
- `chk_listing_projection_block_id_nonnegative`
  `CHECK (block_id >= 0)`
- `chk_listing_projection_block_range`
  `CHECK (variant_doc_from >= 0 AND variant_doc_to > variant_doc_from)`
- `chk_listing_projection_block_counts_nonnegative`
  `CHECK (variant_count >= 0 AND product_count >= 0)`

Indexes:

```sql
CREATE INDEX idx_listing_projection_block_range
  ON listing.listing_posting_variant_projection_block (
    project_id,
    variant_doc_from,
    variant_doc_to
  );
```

Freshness audit later must verify `variant_count = rb_cardinality(variant_bitmap)`
and `product_count = rb_cardinality(product_bitmap)`. Do not add DB triggers for
this.

## PostgreSQL migration 0101: BM25 title search

File:

```text
services/listing/migrations/domains/0100_listing_index/0101_listing_index__bm25_search.sql
```

DDL prelude:

```sql
CREATE SCHEMA IF NOT EXISTS listing;
CREATE EXTENSION IF NOT EXISTS pg_search;
```

Infrastructure precondition outside migration:

```conf
shared_preload_libraries = 'pg_search'
```

### `listing.product_title_bm25_search_index`

Columns:

| Column | Type | Null/default |
| --- | --- | --- |
| `search_id` | `uuid` | `NOT NULL` |
| `project_id` | `uuid` | `NOT NULL` |
| `product_id` | `uuid` | `NOT NULL` |
| `locale` | `varchar(8)` | `NOT NULL` |
| `kind` | `varchar(16)` | `NOT NULL` |
| `status` | `varchar(16)` | `NOT NULL` |
| `published_at` | `timestamptz` | nullable |
| `product_created_at` | `timestamptz` | `NOT NULL` |
| `product_updated_at` | `timestamptz` | `NOT NULL` |
| `product_revision` | `int` | `NOT NULL DEFAULT 0` |
| `title` | `text` | `NOT NULL DEFAULT ''` |
| `indexed_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:

- `product_title_bm25_search_index_pkey`
  `PRIMARY KEY (product_id, locale)`
- `product_title_bm25_search_id_unique`
  `UNIQUE (search_id)`
- `chk_product_title_bm25_kind`
  `CHECK (kind IN ('BASE', 'BUNDLE'))`
- `chk_product_title_bm25_status`
  `CHECK (status IN ('published', 'draft'))`

Indexes:

```sql
CREATE INDEX idx_product_title_bm25_project_locale_product
  ON listing.product_title_bm25_search_index (project_id, locale, product_id);

CREATE INDEX idx_product_title_bm25_visible
  ON listing.product_title_bm25_search_index (
    project_id,
    locale,
    published_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_title_bm25_search
  ON listing.product_title_bm25_search_index
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

Compatibility gate before shipping this migration:

1. Verify installed `pg_search` version accepts `uuid` as BM25 `key_field`.
2. Verify BM25 index accepts planned `uuid`, `varchar` and `timestamptz` fields.
3. If `uuid` key field is rejected, replace `search_id uuid` with a stable
   unique `search_key text`, keep it first in `USING bm25`, and set
   `WITH (key_field = 'search_key')`.
4. If non-text fields are rejected, keep only supported key/text fields in the
   BM25 index and apply project/locale/status/kind/date predicates in SQL
   candidate queries later.

## Drizzle model layer

### `postgresTypes.ts`

Create a local custom type for `roaringbitmap`:

```ts
import { customType } from "drizzle-orm/pg-core";

export type RoaringBitmapValue = string;

export const roaringbitmap = customType<{
  data: RoaringBitmapValue;
  driverData: string;
}>({
  dataType() {
    return "roaringbitmap";
  },
});
```

Reasoning:

- Drizzle has no built-in `roaringbitmap` column.
- The model layer only needs type-safe table definitions now; runtime bitmap
  SQL binding/serialization can be refined when query repositories are added.
- Keep this type local to listing until another service needs it.

### `listingIndex.ts` imports

Use project-local `listingSchema` and Drizzle primitives:

```ts
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { listingSchema } from "./schema";
import { roaringbitmap } from "./postgresTypes";
```

Do not create Drizzle `pgEnum` objects for `kind`, `status` or `entity_type`.
Use `varchar` plus `check`, matching the SQL schema and avoiding upstream enum
dependencies.

### Common Drizzle helpers/conventions

- `uuid("project_id").notNull()` on every table.
- All timestamps:

```ts
timestamp("...", { withTimezone: true, mode: "string" })
```

- Price/minor-unit and bitmap cardinality bigints:

```ts
bigint("...", { mode: "number" })
```

- Generic numeric sort field:

```ts
numeric("numeric_value", { mode: "string" })
```

- JSON metadata:

```ts
jsonb("metadata").$type<Record<string, unknown>>().notNull().default({})
```

- Checks should use named `check(...)` entries that match SQL names.
- Composite FKs should use named `foreignKey({ name, columns, foreignColumns })`
  and `.onDelete("cascade")`.

### Model definitions to add

Add these exported tables in `listingIndex.ts`:

- `listingDocIdAllocator`
- `productListingIndex`
- `productListingPriceIndex`
- `variantListingIndex`
- `variantListingPriceIndex`
- `listingPostingBitmap`
- `listingPostingProductSort`
- `listingPostingVariantPrice`
- `listingPostingVariantProjectionBlock`
- `productTitleBm25SearchIndex`

Add inferred types for every table:

```ts
export type ProductListingIndex = typeof productListingIndex.$inferSelect;
export type NewProductListingIndex = typeof productListingIndex.$inferInsert;
```

Repeat the same pattern for every table.

### Drizzle constraints/index mapping

Model exact table columns, primary keys, unique constraints, check constraints
and foreign keys.

Model these indexes directly because Drizzle supports them:

- all simple btree indexes;
- all partial indexes with `.where(sql`...`)`;
- all ordered indexes using `.desc()`, `.asc()` and `.nullsLast()`;
- BM25 index using `.using("bm25", ...).with({ key_field: "search_id" })`.

Handle these limitations explicitly:

- PostgreSQL `INCLUDE (product_doc_id)` on
  `idx_listing_posting_product_sort_*` is not available in the current Drizzle
  index builder. Keep exact INCLUDE indexes in SQL migration. In Drizzle, either
  omit those four indexes or define the leading ordered columns only with a code
  comment:

```ts
// SQL migration adds INCLUDE (product_doc_id); Drizzle cannot express INCLUDE.
```

- PostgreSQL extension creation is migration-only. Drizzle custom type does not
  create `CREATE EXTENSION`.
- If BM25 compatibility forces `search_key text` instead of `search_id uuid`,
  update both SQL migration and Drizzle model in the same change.

### `index.ts` exports

Update:

```ts
export * from "./schema.js";
export * from "./postgresTypes.js";
export * from "./listingIndex.js";
```

No repository registration is needed in this no-logic scope.

## Implementation order

1. Preflight migration basenames under
   `services/listing/migrations/domains/**/*.sql`.
2. Confirm local PostgreSQL image/environment has `roaringbitmap` installed.
3. Confirm local PostgreSQL image/environment has `pg_search` installed and
   `shared_preload_libraries = 'pg_search'`.
4. Verify `pg_search` BM25 compatibility for planned column set. Decide whether
   to keep `search_id uuid` or switch to `search_key text`.
5. Create `0100_listing_index__tables.sql` with read-model and roaring posting
   tables.
6. Create `0101_listing_index__bm25_search.sql` with BM25 table and indexes.
7. Create `postgresTypes.ts`.
8. Create `listingIndex.ts` with all table models and inferred types.
9. Update `models/index.ts` exports.
10. Inspect generated TypeScript types manually for expected select/insert field
    names and timestamp/string modes.
11. If code verification is needed, run only the project build workflow
    permitted by project rules. Do not run standalone `test` or `tsc`.

## Manual review checklist

- `rg -n "tag_handles|feature_value_handles|option_value_handles" services/listing/src/repositories/models services/listing/migrations/domains/0100_listing_index`
  returns no runtime model/schema hits.
- `rg -n "product_listing_facet|variant_listing_facet|facet token|token table" services/listing/src/repositories/models services/listing/migrations/domains/0100_listing_index`
  returns no recreated row-token tables.
- `listing_posting_bitmap` has no `product_id`, `variant_id`, `facet_id` or
  `facet_value_id` columns.
- Every new table has `project_id`.
- All child tables that repeat `project_id` have same-schema composite FKs back
  to parent listing rows where target schema requires them.
- `price` and `in_stock` do not appear as generic bitmap field DDL.
- `roaringbitmap` extension is in the table migration.
- `pg_search` extension is in the BM25 migration.
- BM25 table stores title only; no description, SEO, handle, vendor, tag,
  feature, option or category text.
- Drizzle `timestamp` columns use `mode: "string"`.
- Drizzle `bigint` minor-unit/cardinality columns use `{ mode: "number" }`,
  consistent with existing catalog pricing models.
- Drizzle does not introduce upstream FKs or enum dependencies.
- Handwritten SQL contains all exact `INCLUDE (product_doc_id)` indexes.

## Acceptance criteria for this no-logic scope

- New SQL migrations create every table, constraint, FK, check, extension and
  index listed above.
- Drizzle models expose every target table and select/insert type.
- Drizzle model layer matches target columns and same-schema constraints, with
  documented exceptions only for PostgreSQL `INCLUDE`.
- No legacy raw-handle arrays or row-based facet token tables are introduced.
- No repository, sync, workflow, event, query or GraphQL logic is added.
- No changeset file is edited manually.
- Verification does not run standalone `test` or `tsc`; use build only when a
  code-level verification is required.
