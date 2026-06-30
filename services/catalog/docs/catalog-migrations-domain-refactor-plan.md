# Catalog Migrations Domain Refactor Plan

## Goal

Create a domain/entity-oriented canonical migration baseline for catalog from the current Drizzle runtime models in TypeScript while keeping `node-pg-migrate` as the catalog migration runner.

The structured migrations must create the catalog schema directly from the current model contract. The source of truth for table shape, enum values, indexes, constraints, and views is the runtime model layer under:

```text
services/catalog/src/repositories/models/**
```

Drizzle remains a runtime schema/query model. Catalog migrations are handwritten PostgreSQL SQL executed by `node-pg-migrate`; do not use the Drizzle migrator for catalog.

## Current State

`services/catalog/migrations/` is the destination for catalog SQL migrations. The new baseline should be created under `migrations/domains/**`.

The baseline should support fresh disposable databases. There is no stage or production data for catalog.

## Constraints

- Do not edit changeset files.
- Keep Drizzle as the runtime schema/query model.
- Do not use Drizzle migrator for catalog.
- Generate the migration contract from TypeScript Drizzle models.
- Keep migration SQL PostgreSQL-native and allow constructs such as `DEFERRABLE INITIALLY DEFERRED`.
- Preserve `catalog.pgmigrations` as the catalog migration tracking table.
- Keep service build assets compatible with nested migration files.
- Do not run `test` or `tsc` for verification. Use build and migration checks.

## Source Of Truth

Use these files as the canonical input when creating the migration inventory:

```text
services/catalog/src/repositories/models/index.ts
services/catalog/src/repositories/models/**/*.ts
```

The inventory must be extracted from Drizzle runtime definitions:

- `pgSchema`, `pgTable`, `pgEnum`, view definitions, and exported table/view objects;
- column definitions, PostgreSQL types, enum references, defaults, nullability, generated/identity behavior, arrays, JSON, numeric precision, and timestamp modes;
- primary keys, unique constraints, foreign keys, checks, indexes, partial predicates, operator classes, sort order, and deferrability when represented in models;
- raw SQL fragments used by model definitions, especially view definitions and expression indexes;
- model export names and repository usage where ownership is ambiguous.

If a required database detail is not expressible or not visible in the Drizzle model, record that gap in the inventory before writing SQL. Resolve the gap by making an explicit decision in the inventory, not by guessing inside a migration file.

## Target Layout

Use domain folders for navigation and ownership. Numeric prefixes are only an execution-order mechanism for `node-pg-migrate`; they are not domain names.

Keep globally unique file basenames because `node-pg-migrate` tracks migrations by basename in `catalog.pgmigrations`. If two domain folders contain the same basename, tracking becomes ambiguous. The domain/entity name after the prefix is the human-readable ownership marker.

```text
services/catalog/migrations/
  domains/
    0000_foundation/
      0000_foundation__schema.sql
      0001_foundation__types.sql
      0002_foundation__extensions.sql
    0100_product/
      0100_product__tables.sql
      0101_product__translations.sql
      0102_product__media.sql
      0103_product__seo.sql
      0104_product__variant_tables.sql
      0105_product__search_index.sql
      0106_product__constraints.sql
    0200_category/
      0200_category__tables.sql
      0201_category__translations.sql
      0202_category__seo_media.sql
      0203_category__product_relations.sql
      0204_category__tag_relations.sql
      0205_category__views.sql
    0300_options/
      0300_options__tables.sql
      0301_options__values.sql
      0302_options__swatches.sql
      0303_options__variant_relations.sql
    0400_features/
      0400_features__features.sql
      0401_features__values.sql
      0402_features__product_relations.sql
    0500_facets/
      0500_facets__tables.sql
      0501_facets__values.sql
      0502_facets__translations.sql
      0503_facets__sources.sql
      0504_facets__relations.sql
    0600_inventory/
      0600_inventory__warehouses.sql
      0601_inventory__items.sql
      0602_inventory__stock.sql
      0603_inventory__reservations.sql
      0604_inventory__supply.sql
      0605_inventory__views.sql
    0700_pricing/
      0700_pricing__item_pricing.sql
      0701_pricing__cost_history.sql
      0702_pricing__views.sql
    0800_bundles/
      0800_bundles__tables.sql
      0801_bundles__configuration.sql
      0802_bundles__items.sql
      0803_bundles__pricing.sql
      0804_bundles__dependencies.sql
      0805_bundles__views.sql
    0900_collections/
      0900_collections__tables.sql
      0901_collections__items.sql
      0902_collections__rules.sql
      0903_collections__translations.sql
      0904_collections__seo_media.sql
    1000_bulk_edit/
      1000_bulk_edit__jobs.sql
      1001_bulk_edit__items.sql
      1002_bulk_edit__fences.sql
    1100_dependencies/
      1100_dependencies__rules.sql
      1101_dependencies__conditions.sql
      1102_dependencies__actions.sql
    9000_read_models/
      9000_read_models__listing.sql
      9001_read_models__product.sql
      9002_read_models__category.sql
      9003_read_models__inventory.sql
```

The exact file list may change after inventory. Every final file must answer two questions from its path alone: which domain owns it, and which entity/read model it changes.

## Domain Ownership Rules

- Foundation owns schema creation, enums, global helper types, and extension setup.
- Product owns `product`, `variant`, product translations, product SEO, product media, variant media, search index tables, and product/variant read models.
- Category owns `category`, `tag`, translations, category SEO/media, category-product joins, category-tag joins, product-tag joins, and category/tag list views.
- Options owns product options, option values, swatches, and variant option links.
- Features owns product feature groups, feature values, translations, and feature relations.
- Facets owns facets, facet values, facet translations, swatches, source handles/sources, and facet relation tables.
- Inventory owns warehouses, inventory items, stock, stock changes, reservations, inbound supply, and inventory views.
- Pricing owns item pricing, variant cost history, current price/cost views, and product price range views.
- Bundles owns bundle root tables, configurations, groups, items, option selections, bundle pricing rules/templates, and bundle list views.
- Collections owns collections, collection items, collection rules, translations, SEO, and media.
- Bulk edit owns bulk edit jobs, items, operation fences, statuses, and cancel reasons.
- Dependencies owns dependency rules, condition groups, conditions, and dependency actions.
- Cross-domain read models go in `9000_read_models` only when no single entity clearly owns the view.

## Inventory Contract

Before writing SQL, create a complete final-schema inventory from Drizzle runtime models:

```text
object type -> object name -> owning domain -> target canonical file -> complete final DDL attributes -> source model file
```

For every table column, the inventory must include:

- exact PostgreSQL type, including enum schema, precision, scale, array type, and JSON type where applicable;
- `NOT NULL` vs nullable;
- default expression, including `now()`, identity/sequence defaults, boolean defaults, numeric defaults, enum defaults, JSON defaults, and string literal defaults;
- generated/identity/sequence behavior if present;
- collation or special storage options if present;
- source TypeScript model file and exported model symbol.

For every primary key, unique constraint, foreign key, and check constraint, the inventory must include:

- exact constraint name;
- ordered column list or check expression;
- referenced schema/table/columns for foreign keys;
- `ON DELETE`, `ON UPDATE`, `MATCH`, `DEFERRABLE`, and `INITIALLY` options;
- whether the constraint is inline in the table file or attached in a later constraints file because of dependency order;
- source TypeScript model file and model declaration.

For every index, the inventory must include:

- exact index name;
- uniqueness;
- access method, such as `btree` or `gin`;
- ordered key columns and expressions;
- sort order, null ordering, operator class, included columns, and predicate for partial indexes;
- target owner file;
- source TypeScript model file and model declaration.

For every view, the inventory must include:

- exact final `CREATE VIEW` SQL;
- ordered output column names and aliases;
- source tables/views and dependency order;
- whether the view is domain-owned or cross-domain under `9000_read_models`;
- source TypeScript model file and raw SQL definition.

For every enum and extension, the inventory must include:

- exact schema-qualified object name;
- ordered enum values;
- extension name, target schema, and whether `CREATE EXTENSION IF NOT EXISTS` is required;
- source TypeScript model file for enums, or explicit inventory decision for extensions.

The inventory is complete only when every exported Drizzle table, enum, and view model is either assigned to a canonical SQL file or explicitly documented as not creating a database object.

Keep the inventory document or generated report in `services/catalog/docs/` until the baseline is reviewed.

## Canonical SQL Rules

Each SQL file must contain final object definitions directly:

- `CREATE SCHEMA`;
- `CREATE TYPE`;
- `CREATE EXTENSION`;
- `CREATE TABLE`;
- `ALTER TABLE ... ADD CONSTRAINT`;
- `CREATE INDEX`;
- `CREATE VIEW`.

Rules:

- generate SQL from the accepted model inventory;
- keep SQL readable and reviewable;
- keep unrelated entities in separate owner files even if dependency order would allow combining them;
- keep FK constraints after both referenced tables exist;
- keep views after all source tables and prerequisite views exist;
- schema-qualify catalog objects with `"catalog"`;
- use exact names from Drizzle models when the model declares names;
- when Drizzle uses generated/default names, choose stable explicit names and record them in the inventory;
- do not create placeholder files unless they document a deliberate reserved domain boundary.

Build the baseline in dependency layers:

1. schema, extensions, and enum types;
2. base tables by entity domain;
3. join tables by owner domain;
4. indexes and constraints by owner domain;
5. views/read models last.

## Runner Changes

`node-pg-migrate` does not recursively read nested directories when `dir` is a normal folder. Update the catalog runner to use glob mode.

Target runner shape:

```ts
await runner({
  databaseUrl: cleanUrl,
  dir: `${migrationsFolder}/domains/**/*.sql`,
  useGlob: true,
  direction: "up",
  migrationsTable: "pgmigrations",
  migrationsSchema: "catalog",
  createMigrationsSchema: true,
  singleTransaction: false,
  checkOrder: true,
  log: () => {},
});
```

Keep `singleTransaction: false` so a future migration can opt into PostgreSQL operations that cannot run inside one global transaction. Individual SQL files should stay transaction-safe unless a specific operation requires otherwise.

Update both catalog migration entry points:

- `packages/cli/src/scripts/migrate.ts`;
- `services/catalog/src/infrastructure/db/migrate.ts`.

Runner responsibilities:

- use recursive glob mode for `migrations/domains/**/*.sql`;
- keep tracking in `catalog.pgmigrations`;
- ignore files outside `migrations/domains/**`.

## Refactor Phases

### Phase 1: Extract Model Inventory

Create a complete final-schema inventory from `services/catalog/src/repositories/models/**`.

Classify final objects by owner:

- `CREATE SCHEMA`, `CREATE TYPE`, extensions -> foundation;
- `CREATE TABLE` -> entity owner;
- constraints -> table owner unless it is a join table;
- indexes -> indexed table owner;
- final view definitions -> read model owner.

Do not start Phase 2 until every exported Drizzle model object is assigned to a canonical file or explicitly documented as non-DDL.

### Phase 2: Create Structured Baseline SQL

Create canonical baseline files under `migrations/domains/**`.

Use the complete model inventory as the SQL contract, including types, nullability, defaults, constraints, index predicates, and final view definitions.

### Phase 3: Update Catalog Runner

Update both migration entry points to use `useGlob: true` and `dir: ${migrationsFolder}/domains/**/*.sql`.

### Phase 4: Build Asset Check

Current catalog build assets copy `migrations/**/*` to `dist/migrations`, which should preserve nested domain folders.

Verify after build that the dist output contains:

```text
services/catalog/dist/migrations/domains/**/*.sql
```

If the build tool flattens nested assets unexpectedly, update the catalog `assets` entry before enabling nested runner glob.

### Phase 5: Validation Matrix

Use disposable databases. Do not validate by running against shared development data first.

Fresh database:

- run catalog migrations from structured files;
- verify `catalog.pgmigrations` contains only structured basenames;
- verify `catalog` schema objects exist;
- compare the created database schema against the accepted model inventory.

Model consistency:

- verify every exported Drizzle table, enum, and view has a corresponding inventory entry;
- verify every inventory DDL object has a corresponding SQL statement in `migrations/domains/**`;
- verify every SQL file basename is globally unique.

## Verification Commands

Do not run `test` or `tsc` for this refactor. Use build and migration checks.

Suggested commands after implementation:

```bash
yarn shopana build -s catalog
yarn shopana db migrate -s catalog
```

For schema inspection, use PostgreSQL tools against disposable databases:

```bash
pg_dump --schema-only --schema=catalog "$DATABASE_URL" > /tmp/catalog-schema.sql
```

Normalize volatile dump lines before diffing, such as ownership and comments, if they are environment-specific.

## Acceptance Criteria

- Catalog migrations are under `migrations/domains/**` and grouped by entity/domain.
- Fresh catalog migrations create the final schema directly from the accepted Drizzle model inventory.
- The final-schema inventory is complete enough to recreate the schema from the Drizzle model contract.
- Fresh catalog schema matches the accepted inventory for column types, nullability, defaults, enum values, constraints, indexes, partial predicates, and views.
- `catalog.pgmigrations` remains the only `node-pg-migrate` tracking table for catalog.
- Future catalog migrations have a clear owner folder and globally unique basename.
- Catalog runner loads only `migrations/domains/**/*.sql` for catalog.

## Follow-Up Cleanup

After the baseline is implemented:

- update knowledge base docs for catalog migration conventions;
- keep catalog migrations handwritten for `node-pg-migrate`;
- keep Drizzle models as runtime query/schema definitions and as the source for future model-derived migration planning.
