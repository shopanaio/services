# Catalog Migrations Domain Refactor Plan

## Goal

Replace catalog's Drizzle-generated chronological SQL history with a domain/entity-oriented canonical baseline that is readable and maintainable while keeping `node-pg-migrate` as the catalog migration runner.

The new structured migrations must create the correct final schema directly. They must not replay historical churn from the old Drizzle files, such as creating and dropping the same view, renaming a field through intermediate names, dropping and recreating indexes, or carrying obsolete columns that only existed during generation history.

The refactor should preserve two runtime paths:

- a fresh database can build the full final catalog schema from the new structured baseline files;
- an existing database that already ran the full old Drizzle-generated history does not rerun DDL and only migrates tracking state.

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
  0007_amused_stick.sql
  0008_aspiring_talkback.sql
  meta/
```

Problems:

- `0000_mature_charles_xavier.sql` contains most catalog entities in one large file.
- Later files mix product, category, bundle, pricing, facets, inventory, and view changes.
- Some later files describe historical churn rather than the desired baseline schema: view replacements, column renames, dropped columns, and replacement indexes.
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

Use domain folders for navigation and ownership. Numeric prefixes are only an execution-order mechanism for `node-pg-migrate`; they are not domain names.

Keep globally unique numeric file prefixes because `node-pg-migrate` tracks by file basename in `catalog.pgmigrations`. If two domain folders contain the same basename, tracking becomes ambiguous. The domain/entity name after the prefix is the human-readable ownership marker.

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

## Entity and Domain File Distribution

The split must be entity-oriented inside each domain folder, not only numeric buckets. Use the following target ownership map when creating the real files:

| Domain folder | Entity-owned files | Owned objects |
| --- | --- | --- |
| `0000_foundation/` | `0000_foundation__schema.sql`, `0001_foundation__types.sql`, optional `0002_foundation__extensions.sql` | `catalog` schema, enum types, global helper database objects, required extensions |
| `0100_product/` | `0100_product__tables.sql`, `0101_product__translations.sql`, `0102_product__media.sql`, `0103_product__seo.sql`, `0104_product__variant_tables.sql`, `0105_product__search_index.sql`, `0106_product__constraints.sql` | `product`, `product_translation`, product SEO/media tables, `variant`, variant media/option links owned by product shape, product and variant search indexes |
| `0200_category/` | `0200_category__tables.sql`, `0201_category__translations.sql`, `0202_category__seo_media.sql`, `0203_category__product_relations.sql`, `0204_category__tag_relations.sql`, `0205_category__views.sql` | `category`, category translations, category SEO/media, `product_category`, category tags, category list view |
| `0300_options/` | `0300_options__tables.sql`, `0301_options__values.sql`, `0302_options__swatches.sql`, `0303_options__variant_relations.sql` | `product_option`, option translations, option values, option value translations, swatches, variant option value relations |
| `0400_features/` | `0400_features__groups.sql`, `0401_features__features.sql`, `0402_features__values.sql`, `0403_features__product_relations.sql` | feature groups, product features, feature values, translations, product-feature relations |
| `0500_facets/` | `0500_facets__tables.sql`, `0501_facets__values.sql`, `0502_facets__translations.sql`, `0503_facets__sources.sql`, `0504_facets__relations.sql` | facets, facet groups, facet values, translations, source handles/sources, facet relations |
| `0600_inventory/` | `0600_inventory__warehouses.sql`, `0601_inventory__items.sql`, `0602_inventory__stock.sql`, `0603_inventory__reservations.sql`, `0604_inventory__supply.sql`, `0605_inventory__views.sql` | warehouses, inventory items, stock, stock changes, reservations, inbound supply, inventory list views |
| `0700_pricing/` | `0700_pricing__item_pricing.sql`, `0701_pricing__cost_history.sql`, `0702_pricing__views.sql` | item pricing, variant cost history, current price/cost views, product price range view |
| `0800_bundles/` | `0800_bundles__tables.sql`, `0801_bundles__configuration.sql`, `0802_bundles__items.sql`, `0803_bundles__pricing.sql`, `0804_bundles__dependencies.sql`, `0805_bundles__views.sql` | bundle root tables, configurations, groups, items, option selections, bundle price rules/templates, bundle list view |
| `0900_collections/` | `0900_collections__tables.sql`, `0901_collections__items.sql`, `0902_collections__rules.sql`, `0903_collections__translations.sql`, `0904_collections__seo_media.sql` | collections, collection items, collection rules, translations, SEO/media |
| `1000_bulk_edit/` | `1000_bulk_edit__jobs.sql`, `1001_bulk_edit__items.sql`, `1002_bulk_edit__fences.sql` | bulk edit jobs, items, operation fences, statuses, cancel reasons |
| `1100_dependencies/` | `1100_dependencies__rules.sql`, `1101_dependencies__conditions.sql`, `1102_dependencies__actions.sql` | dependency rules, condition groups, conditions, dependency actions |
| `9000_read_models/` | `9000_read_models__listing.sql`, `9001_read_models__product.sql`, `9002_read_models__category.sql`, `9003_read_models__inventory.sql` | cross-domain read models only when no single domain clearly owns the view |

The exact file list may change after inventory, but every final file must answer two questions from its path alone: which domain owns it, and which entity/read model it changes.

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

Replacing old Drizzle-generated history with a new canonical baseline creates new basenames. `node-pg-migrate` would treat those as pending unless we mark them as already applied for databases that have already completed the old catalog migration history.

Add a compatibility preflight before `runner(...)`:

1. Ensure `catalog.pgmigrations` exists.
2. Read `services/catalog/migrations/_applied-aliases.json`.
3. Read already-applied old names from:
   - `catalog.pgmigrations`;
   - `drizzle.__drizzle_migrations_catalog`;
   - `drizzle.__drizzle_migrations`.
4. If all required old catalog migration names are already applied, insert every new canonical baseline basename into `catalog.pgmigrations` if missing.
5. If only part of the old catalog migration history is applied, fail with a clear error. Partial old-history databases are not a supported cutover target for this refactor; recreate the disposable database or finish the old history first.
6. Run `node-pg-migrate`.

Suggested alias file:

```json
{
  "oldHistoryCompleteWhenApplied": [
    "0000_mature_charles_xavier",
    "0001_bored_red_skull",
    "0002_uppercase_bundle_display_style",
    "0003_absurd_cerise",
    "0004_rainy_jack_power",
    "0005_sloppy_zombie",
    "0006_chemical_hulk",
    "0007_amused_stick",
    "0008_aspiring_talkback"
  ],
  "canonicalBaselineAppliedNames": [
    "0000_foundation__schema",
    "0001_foundation__types",
    "0100_product__tables",
    "0200_category__tables",
    "9000_read_models__listing"
  ]
}
```

The actual `canonicalBaselineAppliedNames` list must contain every new baseline SQL basename. It is not a statement-level mapping from old files to new files.

Fresh databases do not have old applied names, so no aliases are inserted and the new structured SQL files run normally.

Existing fully migrated databases have the complete old history, so every new canonical baseline file is marked applied and not rerun.

## Refactor Phases

### Phase 1: Inventory Final Schema

Create a final-schema inventory from Drizzle models and the effective end state of existing migration files:

```text
object type -> object name -> owning domain -> target canonical file
```

Classify final objects by owner:

- `CREATE SCHEMA`, `CREATE TYPE`, extensions -> foundation;
- `CREATE TABLE` -> entity owner;
- constraints -> table owner unless it is a join table;
- indexes -> indexed table owner;
- final view definitions -> read model owner;

The inventory must describe the target final schema only. Do not keep objects that were created only to be dropped or renamed by later historical migrations.

Keep the inventory document or generated report in `services/catalog/docs/` until the baseline is reviewed.

### Phase 2: Create Structured Baseline SQL

Move old root migration files to `migrations/legacy-drizzle/` for audit history.

Create new canonical baseline files under `migrations/domains/**`.

Rules:

- create the final schema directly from scratch;
- do not replay historical `CREATE` -> `DROP`, rename, replacement-index, or replacement-view sequences;
- keep only the final desired table, column, constraint, index, type, and view definitions;
- do not combine unrelated entities just because they appeared in the same old generated file;
- keep FK constraints after both referenced tables exist;
- keep views after all source tables and prerequisite views exist;
- write canonical SQL that is easy to review, not generated churn copied verbatim.

Build the baseline in dependency layers:

1. schema and enum types;
2. base tables by entity domain;
3. join tables by owner domain;
4. indexes and constraints by owner domain;
5. views/read models last.

### Phase 3: Add Alias Mapping

Create `migrations/_applied-aliases.json`.

The alias file is a cutover marker, not a split-history map:

- list every old migration basename required to consider the old catalog history complete;
- list every new canonical baseline basename that should be marked applied when the old history is complete;
- keep new baseline aliases in execution order.

Acceptance:

- every canonical baseline SQL file is listed exactly once in `canonicalBaselineAppliedNames`;
- every old root migration file through the cutover point is listed in `oldHistoryCompleteWhenApplied`;
- future migrations after the baseline are not listed in aliases;
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

- prepare a database with only part of the old history applied;
- run new catalog runner;
- verify the runner fails with a clear unsupported-partial-history error;
- recreate the disposable database or finish the old history before applying the refactor.

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
- Fresh catalog migrations create the final schema directly and do not replay historical create/drop/rename churn.
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
- keep catalog without `db:generate`, `drizzle-kit`, and `drizzle.config.ts`; Drizzle is runtime-only for catalog.
