# Catalog Migrations Domain Refactor Plan

## Goal

Reorganize catalog SQL migrations from Drizzle-generated chronological files into a domain/entity-oriented structure that is readable and maintainable while keeping `node-pg-migrate` as the catalog migration runner.

The refactor should preserve two runtime paths:

- a fresh database can build the full catalog schema from the new structured files;
- an existing database that already ran the old Drizzle-generated files does not rerun DDL and only migrates tracking state.

## Current State

Catalog currently has root-level Drizzle-generated SQL files:

```text
services/catalog/migrations/
  0000_mature_charles_xavier.sql
  0001_bored_red_skull.sql
  0002_uppercase_bundle_display_style.sql
  0003_absurd_cerise.sql
  0004_rainy_jack_power.sql
  0005_sloppy_zombie.sql
  0006_chemical_hulk.sql
  meta/
```

Problems:

- `0000_mature_charles_xavier.sql` contains most catalog entities in one large file.
- Later files mix product, category, bundle, pricing, and view changes.
- `migrations/meta` is Drizzle Kit state, not useful for hand-written SQL migration ownership.
- `node-pg-migrate` tracks migrations by file basename in `catalog.pgmigrations`, so moving or splitting already-applied files requires an explicit compatibility strategy.

## Constraints

- Do not edit changeset files.
- Keep Drizzle as runtime schema/query model only.
- Do not use Drizzle migrator for catalog.
- Keep migration SQL PostgreSQL-native and allow constructs such as `DEFERRABLE INITIALLY DEFERRED`.
- Preserve `catalog.pgmigrations` as the catalog migration tracking table.
- Keep service build assets compatible with nested migration files.

## Target Layout

Use domain folders for navigation, but keep globally unique numeric file prefixes because `node-pg-migrate` tracks by basename.

```text
services/catalog/migrations/
  domains/
    0000_foundation/
      0000_foundation__schema.sql
      0001_foundation__types.sql
    0100_product/
      0100_product__tables.sql
      0101_product__constraints.sql
      0102_product__views.sql
    0200_category/
      0200_category__tables.sql
      0201_category__relations.sql
      0202_category__views.sql
    0300_options/
      0300_options__tables.sql
      0301_options__relations.sql
    0400_features/
      0400_features__tables.sql
      0401_features__relations.sql
    0500_facets/
      0500_facets__tables.sql
      0501_facets__relations.sql
    0600_inventory/
      0600_inventory__tables.sql
      0601_inventory__stock.sql
      0602_inventory__views.sql
    0700_pricing/
      0700_pricing__tables.sql
      0701_pricing__views.sql
    0800_bundles/
      0800_bundles__tables.sql
      0801_bundles__pricing.sql
      0802_bundles__views.sql
    0900_collections/
      0900_collections__tables.sql
      0901_collections__relations.sql
    1000_bulk_edit/
      1000_bulk_edit__tables.sql
    1100_dependencies/
      1100_dependencies__conditions.sql
      1101_dependencies__rules.sql
    9000_read_models/
      9000_read_models__product_listing.sql
      9001_read_models__category.sql
  legacy-drizzle/
    0000_mature_charles_xavier.sql
    ...
    meta/
  _applied-aliases.json
```

Domain folders are for ownership. Numeric prefixes still define execution order.

## Domain Ownership Rules

- Foundation owns schema creation, enums, global helper types, and extension setup.
- Product owns `product`, `variant`, translations, SEO, media, search index, product list views, and product-variant read models.
- Category owns `category`, category translations, category SEO/media, product-category joins, category tags, and category list views.
- Options owns product options, option values, swatches, and variant option links.
- Features owns product feature groups, feature values, translations, and feature relations.
- Facets owns facets, facet groups, facet values, facet translations, swatches, and source handles.
- Inventory owns warehouses, inventory items, stock, reservations, supply, transfers, and inventory views.
- Pricing owns item pricing, product price range, cost history, and price read models.
- Bundles owns bundle tables, bundle item/configuration tables, bundle pricing rules, and bundle list views.
- Collections owns collections, collection items, collection rules, translations, SEO, and media.
- Bulk edit owns bulk edit jobs, items, fences, statuses, and cancel reasons.
- Dependencies owns conditions, dependency rules, and dependency actions.
- Cross-domain read models go in `9000_read_models` only when no single entity clearly owns them.

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

## Applied-State Compatibility

Renaming or splitting applied migrations creates new basenames. `node-pg-migrate` would treat those as pending unless we mark them as already applied.

Add a compatibility preflight before `runner(...)`:

1. Ensure `catalog.pgmigrations` exists.
2. Read `services/catalog/migrations/_applied-aliases.json`.
3. Read already-applied old names from:
   - `catalog.pgmigrations`;
   - `drizzle.__drizzle_migrations_catalog`;
   - `drizzle.__drizzle_migrations`.
4. For every old migration name that is already applied, insert the mapped new migration names into `catalog.pgmigrations` if missing.
5. Run `node-pg-migrate`.

Suggested alias file:

```json
{
  "0000_mature_charles_xavier": [
    "0000_foundation__schema",
    "0001_foundation__types",
    "0100_product__tables",
    "0200_category__tables"
  ],
  "0001_bored_red_skull": [
    "0602_inventory__views",
    "9000_read_models__product_listing"
  ]
}
```

The actual mapping must be produced after splitting each old SQL file. Do not guess this mapping manually without reviewing the statements.

Fresh databases do not have old applied names, so no aliases are inserted and the new structured SQL files run normally.

Existing databases have old applied names, so the equivalent new structured files are marked applied and not rerun.

## Refactor Phases

### Phase 1: Inventory Current SQL

Create a migration inventory table from existing files:

```text
old file -> statement number -> object type -> object name -> owning domain
```

Classify statements by object:

- `CREATE SCHEMA`, `CREATE TYPE`, extensions -> foundation;
- `CREATE TABLE` -> entity owner;
- `ALTER TABLE ... ADD CONSTRAINT` -> table owner unless it is a join table;
- `CREATE INDEX` -> indexed table owner;
- `CREATE VIEW` / `DROP VIEW` -> read model owner;
- data backfills -> owner of the written table.

Keep the inventory document or generated report in `services/catalog/docs/` until the migration split is reviewed.

### Phase 2: Split SQL Into Structured Files

Move old root migration files to `migrations/legacy-drizzle/` for audit history.

Create new files under `migrations/domains/**`.

Rules:

- preserve the SQL semantics exactly;
- preserve dependency order across files;
- do not combine unrelated entities just because they appeared in the same old generated file;
- keep FK constraints after both referenced tables exist;
- keep views after all source tables and prerequisite views exist;
- keep `DROP VIEW` / `CREATE VIEW` pairs together when they represent one read-model replacement;
- avoid editing SQL style unless required to make the split valid.

For the large initial migration, split in dependency layers:

1. schema and enum types;
2. base tables by entity domain;
3. join tables by owner domain;
4. indexes and constraints by owner domain;
5. views/read models last.

### Phase 3: Add Alias Mapping

Create `migrations/_applied-aliases.json`.

For each old file:

- list every new migration basename that contains statements from that old file;
- keep aliases in execution order;
- include view replacement files and small one-off files, not only the initial schema split.

Acceptance:

- every new structured file is mapped from exactly one old migration when it contains historical SQL;
- future migrations are not listed in aliases;
- alias basenames match actual file basenames without `.sql`.

### Phase 4: Update Catalog Runner

Update both catalog migration entry points:

- `packages/cli/src/scripts/migrate.ts`;
- `services/catalog/src/infrastructure/db/migrate.ts`.

Runner responsibilities:

- seed aliases before calling `node-pg-migrate`;
- use recursive glob mode for `migrations/domains/**/*.sql`;
- keep tracking in `catalog.pgmigrations`;
- ignore `legacy-drizzle/**` and `meta/**`;
- keep old Drizzle compatibility seeding only as a fallback until all environments have transitioned.

### Phase 5: Build Asset Check

Current catalog build assets already copy `migrations/**/*` to `dist/migrations`, which should preserve nested domain folders.

Verify after build that the dist output contains:

```text
services/catalog/dist/migrations/domains/**/*.sql
services/catalog/dist/migrations/_applied-aliases.json
services/catalog/dist/migrations/legacy-drizzle/**
```

If the build tool flattens nested assets unexpectedly, update the catalog `assets` entry before enabling nested runner glob.

### Phase 6: Validation Matrix

Use disposable databases. Do not validate by running against shared development data first.

Fresh database:

- run catalog migrations from the structured files;
- verify `catalog.pgmigrations` contains only new structured basenames;
- verify `catalog` schema objects exist;
- compare schema-only dump against the current Drizzle-generated baseline.

Existing fully migrated database:

- start with old Drizzle/applied migration state;
- run new catalog runner;
- verify no historical DDL is rerun;
- verify `catalog.pgmigrations` now contains structured basenames from aliases;
- verify no duplicate objects or failed `CREATE` statements.

Partially migrated database:

- prepare a database with only old migrations through a chosen cutoff;
- run new catalog runner;
- verify aliases are inserted only for applied old files;
- verify remaining structured files continue from the correct point.

## Verification Commands

Do not run `test` or `tsc` for this refactor. Use build and migration checks.

Suggested commands after implementation:

```bash
yarn shopana build -s catalog
yarn shopana db migrate -s catalog
```

For schema comparison, use PostgreSQL tools against disposable databases:

```bash
pg_dump --schema-only --schema=catalog "$DATABASE_URL" > /tmp/catalog-schema.sql
```

Normalize volatile dump lines before diffing, such as ownership and comments, if they are environment-specific.

## Acceptance Criteria

- Catalog runner no longer depends on Drizzle migration metadata for normal operation.
- Catalog migrations are under `migrations/domains/**` and grouped by entity/domain.
- `legacy-drizzle/**` is retained for audit but excluded from execution.
- `catalog.pgmigrations` remains the only node-pg-migrate tracking table for catalog.
- Existing migrated environments do not rerun historical DDL after the refactor.
- Fresh environments can create the same catalog schema from structured SQL files.
- Future catalog migrations have a clear owner folder and globally unique basename.
- `migrations/meta` is no longer required for catalog migration execution.

## Follow-Up Cleanup

After all environments have run the transition:

- remove fallback reads from old Drizzle tracking tables if no longer needed;
- decide whether to keep `legacy-drizzle/**` permanently or move it to docs/archive;
- update knowledge base docs for catalog migration conventions;
- remove catalog `drizzle.config.ts` only if Drizzle Kit generation is formally retired for catalog.
