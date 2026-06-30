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

## Final Canonical Migration File Contents

This section is the target content contract for the new baseline. Each listed file must contain the final object definitions directly: `CREATE SCHEMA`, `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE ... ADD CONSTRAINT`, `CREATE INDEX`, and final `CREATE VIEW` statements as applicable. Do not include historical `DROP`, rename, intermediate view replacement, obsolete `facet.sort_index`, or old default churn.

The object lists below define ownership and expected objects, but they are not sufficient by themselves to write the final SQL. Before creating the baseline SQL, Phase 1 must expand them into a complete final-schema inventory. Every table, column, constraint, index, enum, sequence, extension, and view must have enough detail in that inventory to recreate the final schema without reading the old Drizzle history.

For every table column, the inventory must include:

- exact PostgreSQL type, including enum schema, precision, scale, array type, and JSON type where applicable;
- `NOT NULL` vs nullable;
- default expression, including `now()`, identity/sequence defaults, boolean defaults, numeric defaults, enum defaults, JSON defaults, and string literal defaults;
- generated/identity/sequence behavior if present;
- collation or special storage options if present;
- whether the column is final, newly canonicalized, or intentionally omitted because it only existed in historical churn.

For every primary key, unique constraint, foreign key, and check constraint, the inventory must include:

- exact constraint name;
- ordered column list or check expression;
- referenced schema/table/columns for foreign keys;
- `ON DELETE`, `ON UPDATE`, `MATCH`, `DEFERRABLE`, and `INITIALLY` options;
- whether the constraint is inline in the table file or attached in a later constraints file because of dependency order.

For every index, the inventory must include:

- exact index name;
- uniqueness;
- access method, such as `btree` or `gin`;
- ordered key columns and expressions;
- sort order, null ordering, operator class, included columns, and predicate for partial indexes;
- target owner file.

For every view, the inventory must include:

- exact final `CREATE VIEW` SQL;
- ordered output column names and aliases;
- source tables/views and dependency order;
- whether the view is domain-owned or cross-domain under `9000_read_models`.

For every enum and extension, the inventory must include:

- exact schema-qualified object name;
- ordered enum values;
- extension name, target schema, and whether `CREATE EXTENSION IF NOT EXISTS` is required.

The inventory must be derived from both sources:

- current Drizzle model files under `services/catalog/src/repositories/models/**`, which are the runtime query contract;
- the effective end state of `services/catalog/migrations/*.sql`, after applying all creates, alters, drops, renames, view replacements, and index replacements.

If these sources disagree, resolve the discrepancy before writing canonical SQL and record the decision in the inventory. The canonical SQL must match the accepted final inventory, not a partial column-only list.

Primary keys, foreign keys, and indexes listed for the same file must be created in that file unless explicitly assigned to a later constraints file.

### `0000_foundation/0000_foundation__schema.sql`

- `CREATE SCHEMA IF NOT EXISTS "catalog";`

### `0000_foundation/0001_foundation__types.sql`

- `catalog.product_kind`: `BASE`, `BUNDLE`.
- `catalog.currency`: `UAH`, `USD`, `EUR`.
- `catalog.bulk_edit_job_status`: `QUEUED`, `RUNNING`, `COMPLETED`, `CANCELLED`.
- `catalog.bulk_edit_cancel_reason`: `USER`, `SUPERSEDED`, `SYSTEM`.
- `catalog.bulk_edit_item_status`: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `SUPERSEDED`.
- `catalog.dimension_unit`: `mm`, `cm`, `m`, `in`, `ft`, `yd`.
- `catalog.weight_unit`: `g`, `kg`, `lb`, `oz`.
- `catalog.stock_apply_status`: `APPLIED`, `REJECTED`.
- `catalog.stock_movement_reason`: `DAMAGE`, `INVENTORY_COUNT`, `MANUAL`, `CUSTOMER_RETURN`.
- `catalog.stock_movement_type`: `SEED`, `RECEIVE`, `SELL`, `RETURN`, `ADJUST`, `RESERVE`, `RELEASE`, `TRANSFER`.
- `catalog.stock_transfer_direction`: `IN`, `OUT`.
- `catalog.reservation_status`: `ACTIVE`, `RELEASED`, `FULFILLED`.

### `0100_product/0100_product__tables.sql`

- `vendor`: `project_id`, `id`, `name`; indexes `vendor_project_id_name_key`, `idx_vendor_project_id`.
- `product`: `project_id`, `id`, `vendor_id`, `handle`, `published_at`, `created_at`, `updated_at`, `deleted_at`, `revision`, `kind`; FK `product_vendor_fk`; indexes `product_project_id_handle_key`, `idx_product_project_id`, `idx_product_vendor_id`, `idx_product_created_at`, `idx_product_updated_at`, `idx_product_deleted_at`, `idx_product_revision`.
- `product_inventory_settings`: `project_id`, `product_id`, `alert_threshold_method`, `alert_minimum_stock`, `backorder_enabled`, `backorder_max_days`, `backorder_max_qty`, `created_at`, `updated_at`; PK `product_inventory_settings_project_id_product_id_pk`.

### `0100_product/0101_product__translations.sql`

- `product_translation`: `project_id`, `product_id`, `locale`, `name`, `description_text`, `description_html`, `description_json`, `excerpt_text`, `excerpt_html`, `excerpt_json`; PK `product_translation_product_id_locale_pk`; FK `product_translation_product_id_product_id_fk`; indexes `idx_product_translation_project`, `idx_product_translation_project_locale`.
- `variant_translation`: `project_id`, `variant_id`, `locale`, `title`; PK `variant_translation_variant_id_locale_pk`; FK `variant_translation_variant_id_variant_id_fk`; index `idx_variant_translation_project`.

### `0100_product/0102_product__media.sql`

- `product_media`: `project_id`, `product_id`, `id`, `file_id`, `sort_index`, `created_at`; FK `product_media_product_fk`; indexes `idx_product_media_project`, `idx_product_media_product`, `idx_product_media_file`, `idx_product_media_sort`.
- `variant_media`: `project_id`, `product_id`, `variant_id`, `product_media_id`, `sort_index`; PK `variant_media_project_id_variant_id_product_media_id_pk`; FKs `variant_media_product_media_fk`, `variant_media_variant_fk`; indexes `idx_variant_media_project`, `idx_variant_media_product`, `idx_variant_media_variant`, `idx_variant_media_product_media`, `idx_variant_media_sort`.

### `0100_product/0103_product__seo.sql`

- `product_seo`: `project_id`, `product_id`, `locale`, `seo_title`, `seo_description`, `og_title`, `og_description`, `og_image_id`; PK `product_seo_product_id_locale_pk`; FK `product_seo_product_id_product_id_fk`; indexes `idx_product_seo_project`, `idx_product_seo_project_locale`.

### `0100_product/0104_product__variant_tables.sql`

- `variant`: `project_id`, `product_id`, `kind`, `id`, `is_default`, `handle`, `sku`, `external_system`, `external_id`, `updated_at`, `created_at`, `deleted_at`; indexes `variant_product_id_default_key`, `variant_product_id_handle_key`, `variant_project_id_sku_key`, `variant_project_id_external_system_external_id_key`, `idx_variant_project_id`, `idx_variant_product_id`, `idx_variant_product_active`, `idx_variant_created_at`, `idx_variant_updated_at`, `idx_variant_deleted_at`.

### `0100_product/0105_product__search_index.sql`

- `product_search_index`: `project_id`, `product_id`, `status`, `tag_handles`, `feature_slugs`, `category_handles`, `created_at`, `updated_at`; FK `product_search_index_product_id_product_id_fk`; indexes `idx_product_search_index_project_status`, `idx_product_search_index_created_at`, `idx_product_search_index_tag_handles_gin`, `idx_product_search_index_feature_slugs_gin`, `idx_product_search_index_category_handles_gin`.
- `variant_search_index`: `project_id`, `variant_id`, `product_id`, `price_currency`, `price_minor`, `in_stock`, `total_stock`, `option_slugs`, `created_at`, `updated_at`; FKs `variant_search_index_variant_id_variant_id_fk`, `variant_search_index_product_id_product_id_fk`; indexes `idx_variant_search_index_project_product`, `idx_variant_search_index_project_in_stock`, `idx_variant_search_index_project_price`, `idx_variant_search_index_option_slugs_gin`.

### `0100_product/0106_product__constraints.sql`

- Product/variant cross-table constraints that cannot be placed in earlier table files because of dependency order. At minimum, keep final FKs from product-owned tables to product/variant objects here if the baseline generation order requires deferred attachment.

### `0200_category/0200_category__tables.sql`

- `category`: `project_id`, `id`, `parent_id`, `path`, `depth`, `handle`, `default_sort`, `default_sort_direction`, `published_at`, `revision`, `products_count`, `created_at`, `updated_at`, `deleted_at`; indexes `category_project_id_handle_key`, `idx_category_project_id`, `idx_category_parent_id`, `idx_category_path`, `idx_category_published`.
- `tag`: `project_id`, `id`, `handle`, `products_count`, `created_at`; indexes `tag_project_id_handle_key`, `idx_tag_project_id`.

### `0200_category/0201_category__translations.sql`

- `category_translation`: `project_id`, `category_id`, `locale`, `name`, `description_text`, `description_html`, `description_json`, `excerpt_text`, `excerpt_html`, `excerpt_json`; PK `category_translation_category_id_locale_pk`; FK `category_translation_category_id_category_id_fk`; indexes `idx_category_translation_project`, `idx_category_translation_project_locale`.
- `tag_translation`: `project_id`, `tag_id`, `locale`, `name`; PK `tag_translation_tag_id_locale_pk`; FK `tag_translation_tag_id_tag_id_fk`; index `idx_tag_translation_project`.

### `0200_category/0202_category__seo_media.sql`

- `category_seo`: `project_id`, `category_id`, `locale`, `seo_title`, `seo_description`, `og_title`, `og_description`, `og_image_id`; PK `category_seo_category_id_locale_pk`; FK `category_seo_category_id_category_id_fk`; indexes `idx_category_seo_project`, `idx_category_seo_project_locale`.
- `category_media`: `project_id`, `category_id`, `file_id`, `sort_index`; PK `category_media_category_id_file_id_pk`; FK `category_media_category_id_category_id_fk`; index `idx_category_media_category`.

### `0200_category/0203_category__product_relations.sql`

- `product_category`: `project_id`, `product_id`, `category_id`, `is_primary`, `lexo_rank`; PK `product_category_product_id_category_id_pk`; FKs `product_category_product_id_product_id_fk`, `product_category_category_id_category_id_fk`; indexes `product_category_one_primary_per_product_idx`, `idx_product_category_product`, `idx_product_category_category`, `idx_product_category_rank`.

### `0200_category/0204_category__tag_relations.sql`

- `category_tag`: `project_id`, `category_id`, `tag_id`; PK `category_tag_category_id_tag_id_pk`; FKs `category_tag_category_id_category_id_fk`, `category_tag_tag_id_tag_id_fk`; indexes `idx_category_tag_category`, `idx_category_tag_tag`.
- `product_tag`: `project_id`, `product_id`, `tag_id`; PK `product_tag_product_id_tag_id_pk`; FKs `product_tag_product_id_product_id_fk`, `product_tag_tag_id_tag_id_fk`; indexes `idx_product_tag_product`, `idx_product_tag_tag`.

### `0200_category/0205_category__views.sql`

- `category_list_view`: final category translation list view.
- `tag_list_view`: final tag translation list view.

### `0300_options/0300_options__tables.sql`

- `product_option`: `id`, `project_id`, `product_id`, `slug`, `display_type`, `sort_index`; FK `product_option_product_id_product_id_fk`; indexes `idx_product_option_product_id`, `idx_product_option_sort`.

### `0300_options/0301_options__values.sql`

- `product_option_value`: `id`, `project_id`, `option_id`, `swatch_id`, `slug`, `sort_index`; FKs `product_option_value_option_id_product_option_id_fk`, `product_option_value_swatch_id_product_option_swatch_id_fk`; index `idx_product_option_value_option_id`.
- `product_option_translation`: `project_id`, `option_id`, `locale`, `name`; PK `product_option_translation_option_id_locale_pk`; FK `product_option_translation_option_id_product_option_id_fk`; index `idx_product_option_translation_project`.
- `product_option_value_translation`: `project_id`, `option_value_id`, `locale`, `name`; PK `product_option_value_translation_option_value_id_locale_pk`; FK `product_option_value_translation_option_value_id_product_option_value_id_fk`; index `idx_product_option_value_translation_project`.

### `0300_options/0302_options__swatches.sql`

- `product_option_swatch`: `project_id`, `id`, `color_one`, `color_two`, `image_id`, `swatch_type`, `metadata`; index `idx_product_option_swatch_project_id`.

### `0300_options/0303_options__variant_relations.sql`

- `product_option_variant_link`: `project_id`, `variant_id`, `option_id`, `option_value_id`; PK `product_option_variant_link_variant_id_option_id_pk`; FKs `product_option_variant_link_variant_id_variant_id_fk`, `product_option_variant_link_option_id_product_option_id_fk`, `product_option_variant_link_option_value_id_product_option_value_id_fk`; index `idx_product_option_variant_link_project_id`.

### `0400_features/0400_features__groups.sql`

- No separate `feature_group` table exists in the current final schema. Feature groups are represented by `product_feature.is_group = true` and parent-child rows.

### `0400_features/0401_features__features.sql`

- `product_feature`: `id`, `project_id`, `product_id`, `slug`, `index`, `is_group`, `parent_id`; FKs `product_feature_product_id_product_id_fk`, `product_feature_parent_id_product_feature_id_fk`; indexes `product_feature_sort_idx`, `idx_product_feature_product_id`, `product_feature_children_idx`.
- `product_feature_translation`: `project_id`, `feature_id`, `locale`, `name`; PK `product_feature_translation_feature_id_locale_pk`; FK `product_feature_translation_feature_id_product_feature_id_fk`; index `idx_product_feature_translation_project`.

### `0400_features/0402_features__values.sql`

- `product_feature_value`: `id`, `project_id`, `feature_id`, `slug`, `index`; FK `product_feature_value_feature_id_product_feature_id_fk`; index `idx_product_feature_value_feature_id`.
- `product_feature_value_translation`: `project_id`, `feature_value_id`, `locale`, `name`; PK `product_feature_value_translation_feature_value_id_locale_pk`; FK `product_feature_value_translation_feature_value_id_product_feature_value_id_fk`; index `idx_product_feature_value_translation_project`.

### `0400_features/0403_features__product_relations.sql`

- Reserved for future feature-product relation tables. The current final schema stores feature ownership directly on `product_feature.product_id`.

### `0500_facets/0500_facets__tables.sql`

- `facet`: `id`, `project_id`, `facet_type`, `ui_type`, `selection_mode`, `lexo_rank`, `slug`, `created_at`, `updated_at`; index `idx_facet_rank`. The final baseline must use `lexo_rank`, not the obsolete `sort_index`.
- `facet_swatch`: `id`, `project_id`, `swatch_type`, `color_one`, `color_two`, `image_id`, `metadata`.

### `0500_facets/0501_facets__values.sql`

- `facet_value`: `id`, `project_id`, `facet_id`, `slug`, `swatch_id`, `sort_index`, `enabled`, `created_at`, `updated_at`; FKs `facet_value_facet_id_facet_id_fk`, `facet_value_swatch_id_facet_swatch_id_fk`.
- `facet_value_source_handle`: `id`, `project_id`, `facet_id`, `facet_value_id`, `facet_type`, `source_handle`, `created_at`; FKs `facet_value_source_handle_facet_id_facet_id_fk`, `facet_value_source_handle_facet_value_id_facet_value_id_fk`; indexes `idx_facet_value_source_handle_project_value`, `idx_facet_value_source_handle_project_type_source`.

### `0500_facets/0502_facets__translations.sql`

- `facet_translation`: `facet_id`, `locale`, `project_id`, `label`; PK `facet_translation_facet_id_locale_pk`; FK `facet_translation_facet_id_facet_id_fk`; index `idx_facet_translation_project_locale`.
- `facet_value_translation`: `facet_value_id`, `locale`, `project_id`, `label`; PK `facet_value_translation_facet_value_id_locale_pk`; FK `facet_value_translation_facet_value_id_facet_value_id_fk`; index `idx_facet_value_translation_project_locale`.

### `0500_facets/0503_facets__sources.sql`

- `facet_source`: `id`, `project_id`, `facet_id`, `facet_type`, `handle`, `created_at`; FK `facet_source_facet_id_facet_id_fk`; indexes `idx_facet_source_project_facet`, `idx_facet_source_project_type_handle`.
- `facet_source_translation`: `facet_source_id`, `locale`, `project_id`, `name`; PK `facet_source_translation_facet_source_id_locale_pk`; FK `facet_source_translation_facet_source_id_facet_source_id_fk`; index `idx_facet_source_translation_project_locale`.

### `0500_facets/0504_facets__relations.sql`

- Reserved for future facet relation tables. Current final facet relations are contained in `facet_value_source_handle` and `facet_source`.

### `0600_inventory/0600_inventory__warehouses.sql`

- `warehouses`: `project_id`, `id`, `code`, `name`, `is_default`, `created_at`, `updated_at`; index `idx_warehouses_default_unique`.
- `warehouse_translation`: `project_id`, `warehouse_id`, `locale`, `name`; PK `warehouse_translation_warehouse_id_locale_pk`; FK `warehouse_translation_warehouse_id_warehouses_id_fk`; index `idx_warehouse_translation_project`.

### `0600_inventory/0601_inventory__items.sql`

- `inventory_item`: `id`, `project_id`, `variant_id`, `sku`, `track_inventory`, `continue_selling_when_out_of_stock`, `created_at`, `updated_at`; indexes `idx_inventory_item_variant`, `idx_inventory_item_project`.
- `item_dimensions`: `variant_id`, `project_id`, `w_mm`, `l_mm`, `h_mm`, `display_unit`; index `idx_item_dimensions_project_id`.
- `item_weight`: `variant_id`, `project_id`, `weight_gr`, `display_unit`; index `idx_item_weight_project_id`.

### `0600_inventory/0602_inventory__stock.sql`

- `warehouse_stock`: `project_id`, `id`, `warehouse_id`, `variant_id`, `quantity_on_hand`, `reserved_qty`, `unavailable_qty`, `updated_at`, `created_at`; FK `warehouse_stock_warehouse_fk`; index `idx_warehouse_stock_variant`.
- `stock_changes`: `id`, `seq`, `project_id`, `variant_id`, `warehouse_id`, `delta_on_hand`, `delta_reserved`, `delta_unavailable`, `on_hand_after`, `reserved_after`, `unavailable_after`, `movement_type`, `transfer_direction`, `reason`, `source_system`, `source_event_id`, `correlation_id`, `note`, `created_at`, `created_by`, `apply_status`; FK `stock_changes_warehouse_id_warehouses_id_fk`; indexes `stock_changes_seq_unique`, `idx_stock_changes_idempotency`, `idx_stock_changes_idempo_lookup`, `idx_stock_changes_variant_created_seq`, `idx_stock_changes_variant_warehouse_created_seq`, `idx_stock_changes_project_seq`, `idx_stock_changes_type_seq`, `idx_stock_changes_reason_seq`.

### `0600_inventory/0603_inventory__reservations.sql`

- `reservations`: `id`, `project_id`, `variant_id`, `warehouse_id`, `order_system`, `order_id`, `quantity`, `status`, `reserved_at`, `released_at`; FK `reservations_warehouse_id_warehouses_id_fk`; indexes `idx_reservations_variant`, `idx_reservations_order`.

### `0600_inventory/0604_inventory__supply.sql`

- `inbound_supply`: `id`, `project_id`, `variant_id`, `warehouse_id`, `source_type`, `source_id`, `expected_at`, `qty_expected`, `qty_received`, `status`, `created_at`, `updated_at`; FK `inbound_supply_warehouse_id_warehouses_id_fk`; index `idx_inbound_supply_variant_date`.

### `0600_inventory/0605_inventory__views.sql`

- `variant_warehouse_candidate_view`: final variant/warehouse candidate read model.
- `inventory_item_list_all_stock_view`: final all-stock inventory item list read model.
- `inventory_item_list_warehouse_stock_view`: final warehouse-stock inventory item list read model.

### `0700_pricing/0700_pricing__item_pricing.sql`

- `item_pricing`: `project_id`, `id`, `variant_id`, `currency`, `amount_minor`, `compare_at_minor`, `effective_from`, `effective_to`, `recorded_at`; FK `item_pricing_variant_id_variant_id_fk`; indexes `idx_item_pricing_variant_currency_effective_from`, `idx_item_pricing_variant_effective_from`, `idx_item_pricing_recorded_at`, `idx_item_pricing_effective_to`, `idx_item_pricing_current_unique`.

### `0700_pricing/0701_pricing__cost_history.sql`

- `product_variant_cost_history`: `project_id`, `id`, `variant_id`, `currency`, `unit_cost_minor`, `effective_from`, `effective_to`, `recorded_at`; indexes `idx_product_variant_cost_history_variant_currency_effective_from`, `idx_product_variant_cost_history_variant_effective_from`, `idx_product_variant_cost_history_recorded_at`, `idx_product_variant_cost_history_effective_to`, `idx_product_variant_cost_history_current_unique`.

### `0700_pricing/0702_pricing__views.sql`

- `variant_prices_current`: final current price view from `item_pricing`.
- `product_price_range`: final product price range view from `item_pricing` and active `variant` rows.
- `variant_costs_current`: final current cost view from `product_variant_cost_history`.

### `0800_bundles/0800_bundles__tables.sql`

- `bundle`: `id`, `project_id`, `product_id`, `type`, `display_style`, `created_at`, `updated_at`; FK `bundle_product_id_product_id_fk`; indexes `bundle_product_id_unique`, `idx_bundle_project_id`. The final default for `display_style` is `ACCORDION`.

### `0800_bundles/0801_bundles__configuration.sql`

- `bundle_configuration`: `id`, `project_id`, `bundle_id`, `name`, `created_at`, `updated_at`; FK `bundle_configuration_bundle_id_bundle_id_fk`; index `idx_bundle_configuration_bundle_id`.
- `bundle_configuration_variant`: `project_id`, `configuration_id`, `variant_id`; PK `bundle_configuration_variant_configuration_id_variant_id_pk`; FKs `bundle_configuration_variant_configuration_id_bundle_configuration_id_fk`, `bundle_configuration_variant_variant_id_variant_id_fk`; indexes `bundle_configuration_variant_unique`, `idx_bundle_configuration_variant_project_id`.
- `bundle_group`: `id`, `project_id`, `configuration_id`, `sort_index`, `min_selection`, `max_selection`, `created_at`, `updated_at`; FK `bundle_group_configuration_id_bundle_configuration_id_fk`; indexes `idx_bundle_group_configuration_id`, `idx_bundle_group_sort`.
- `bundle_group_translation`: `project_id`, `group_id`, `locale`, `name`; PK `bundle_group_translation_group_id_locale_pk`; FK `bundle_group_translation_group_id_bundle_group_id_fk`; index `idx_bundle_group_translation_project_locale`.

### `0800_bundles/0802_bundles__items.sql`

- `bundle_item`: `id`, `project_id`, `group_id`, `item_type`, `sort_index`, `ref_product_id`, `ref_variant_id`, `featured_image_id`, `min_qty`, `max_qty`, `default_qty`, `price_rule_id`, `pricing_template_id`, `visible`, `selected`, `created_at`, `updated_at`; FKs `bundle_item_group_id_bundle_group_id_fk`, `bundle_item_price_rule_id_bundle_price_rule_id_fk`, `bundle_item_pricing_template_id_bundle_pricing_template_id_fk`; indexes `idx_bundle_item_group_id`, `idx_bundle_item_ref_product_id`, `idx_bundle_item_ref_variant_id`, `idx_bundle_item_sort`, `idx_bundle_item_price_rule_id`.
- `bundle_item_translation`: `project_id`, `item_id`, `locale`, `name`; PK `bundle_item_translation_item_id_locale_pk`; FK `bundle_item_translation_item_id_bundle_item_id_fk`; index `idx_bundle_item_translation_project_locale`.
- `bundle_item_option_selection`: `id`, `project_id`, `item_id`, `ref_option_id`, `parent_option_id`, `sort_index`, `created_at`, `updated_at`; FKs `bundle_item_option_selection_item_id_bundle_item_id_fk`, `bundle_item_option_selection_ref_option_id_product_option_id_fk`, `bundle_item_option_selection_parent_option_id_product_option_id_fk`; indexes `idx_bundle_item_option_selection_item_id`, `idx_bundle_item_option_selection_ref_option_id`, `idx_bundle_item_option_selection_parent_option_id`, `bundle_item_option_selection_item_option_unique`.
- `bundle_item_option_value_selection`: `id`, `project_id`, `option_selection_id`, `ref_option_value_id`, `value`, `status`, `sort_index`, `created_at`, `updated_at`; FKs `bundle_item_option_value_selection_option_selection_id_bundle_item_option_selection_id_fk`, `bundle_item_option_value_selection_ref_option_value_id_product_option_value_id_fk`; indexes `idx_bundle_item_option_value_selection_option_id`, `idx_bundle_item_option_value_selection_ref_value_id`, `idx_bundle_item_option_value_selection_status`, `bundle_item_option_value_selection_value_unique`.

### `0800_bundles/0803_bundles__pricing.sql`

- `bundle_price_rule`: `id`, `project_id`, `configuration_id`, `price_type`; FK `bundle_price_rule_configuration_id_bundle_configuration_id_fk`; index `idx_bundle_price_rule_configuration_id`.
- `bundle_price_rule_amount`: `project_id`, `price_rule_id`, `currency`, `amount_minor`; PK `bundle_price_rule_amount_price_rule_id_currency_pk`; FK `bundle_price_rule_amount_price_rule_id_bundle_price_rule_id_fk`; index `idx_bundle_price_rule_amount_project_currency`.
- `bundle_price_rule_percent`: `project_id`, `price_rule_id`, `percent_value`; FK `bundle_price_rule_percent_price_rule_id_bundle_price_rule_id_fk`; index `idx_bundle_price_rule_percent_project_id`.
- `bundle_pricing_template`: `id`, `project_id`, `configuration_id`, `name`, `price_rule_id`, `sort_index`; FKs `bundle_pricing_template_configuration_id_bundle_configuration_id_fk`, `bundle_pricing_template_price_rule_id_bundle_price_rule_id_fk`; indexes `idx_bundle_pricing_template_configuration_id`, `idx_bundle_pricing_template_price_rule_id`.

### `0800_bundles/0804_bundles__dependencies.sql`

- Keep this file empty or omit it if dependencies are placed under `1100_dependencies/**`. Do not duplicate dependency tables.

### `0800_bundles/0805_bundles__views.sql`

- `bundle_list_view`: final bundle listing view with `bundle_type`, `min_amount_minor`, `max_amount_minor`, `min_price_minor`, and `max_price_minor`.

### `0900_collections/0900_collections__tables.sql`

- `collection`: `id`, `project_id`, `handle`, `type`, `default_sort`, `default_sort_direction`, `effective_from`, `effective_to`, `published_at`, `created_at`, `updated_at`, `deleted_at`; indexes `collection_project_id_handle_uniq`, `idx_collection_scheduling`.

### `0900_collections/0901_collections__items.sql`

- `collection_item`: `collection_id`, `project_id`, `product_id`, `lexo_rank`, `created_at`; PK `collection_item_collection_id_product_id_pk`; FKs `collection_item_collection_id_collection_id_fk`, `collection_item_product_id_product_id_fk`; index `idx_collection_item_rank`.

### `0900_collections/0902_collections__rules.sql`

- `collection_rule`: `id`, `collection_id`, `project_id`, `field`, `operator`, `value`, `sort_index`, `created_at`, `updated_at`; FK `collection_rule_collection_id_collection_id_fk`; index `idx_collection_rule_collection`.

### `0900_collections/0903_collections__translations.sql`

- `collection_translation`: `collection_id`, `locale`, `project_id`, `name`, `description_text`, `description_html`, `description_json`, `excerpt_text`, `excerpt_html`, `excerpt_json`; PK `collection_translation_collection_id_locale_pk`; FK `collection_translation_collection_id_collection_id_fk`; index `idx_collection_translation_project_locale`.

### `0900_collections/0904_collections__seo_media.sql`

- `collection_seo`: `collection_id`, `locale`, `project_id`, `seo_title`, `seo_description`, `og_title`, `og_description`, `og_image_id`; PK `collection_seo_collection_id_locale_pk`; FK `collection_seo_collection_id_collection_id_fk`; index `idx_collection_seo_project_locale`.
- `collection_media`: `collection_id`, `file_id`, `project_id`, `sort_index`; PK `collection_media_collection_id_file_id_pk`; FK `collection_media_collection_id_collection_id_fk`.

### `1000_bulk_edit/1000_bulk_edit__jobs.sql`

- `bulk_edit_job`: `id`, `project_id`, `status`, `created_at`, `started_at`, `finished_at`; indexes `bulk_edit_job_project_created_idx`, `bulk_edit_job_project_status_idx`.

### `1000_bulk_edit/1001_bulk_edit__items.sql`

- `bulk_edit_item`: `id`, `job_id`, `project_id`, `product_id`, `variant_id`, `op_type`, `op_index`, `chunk_index`, `params`, `status`, `fence_token`, `cancel_requested`, `cancel_reason`, `superseded_by_job_id`, `errors`, `started_at`, `finished_at`; FK `bulk_edit_item_job_id_bulk_edit_job_id_fk`; indexes `bulk_edit_item_project_product_status_idx`, `bulk_edit_item_job_chunk_op_idx`, `bulk_edit_item_job_status_idx`.

### `1000_bulk_edit/1002_bulk_edit__fences.sql`

- `product_bulk_fence`: `project_id`, `product_id`, `fence_token`, `job_id`, `updated_at`; PK `product_bulk_fence_project_id_product_id_pk`; FK `product_bulk_fence_job_id_bulk_edit_job_id_fk`.

### `1100_dependencies/1100_dependencies__rules.sql`

- `dependency_rule`: `id`, `project_id`, `configuration_id`, `name`, `enabled`, `priority`, `logic_operator`, `created_at`, `updated_at`; FK `dependency_rule_configuration_id_bundle_configuration_id_fk`; indexes `idx_dependency_rule_configuration_id`, `idx_dependency_rule_priority`.

### `1100_dependencies/1101_dependencies__conditions.sql`

- `condition_group`: `id`, `project_id`, `rule_id`, `logic_operator`, `sort_index`; FK `condition_group_rule_id_dependency_rule_id_fk`; index `idx_condition_group_rule_id`.
- `condition`: `id`, `project_id`, `group_id`, `category`, `subject`, `operator`, `target_type`, `target_id`, `value`, `sort_index`; FK `condition_group_id_condition_group_id_fk`; indexes `idx_condition_group_id`, `idx_condition_target`.

### `1100_dependencies/1102_dependencies__actions.sql`

- `dependency_action`: `id`, `project_id`, `rule_id`, `action_type`, `target_type`, `target_id`, `required_value`, `price_rule_id`, `stackable`, `sort_index`; FKs `dependency_action_rule_id_dependency_rule_id_fk`, `dependency_action_price_rule_id_bundle_price_rule_id_fk`; indexes `idx_dependency_action_rule_id`, `idx_dependency_action_target`, `idx_dependency_action_price_rule_id`.

### `9000_read_models/9000_read_models__listing.sql`

- `listing_list_view`: final all-product listing view with `min_amount_minor`, `max_amount_minor`, `min_price_minor`, `max_price_minor`, primary category, and brand columns.

### `9000_read_models/9001_read_models__product.sql`

- `product_list_view`: final base-product listing view with `kind = 'BASE'` filter and final price aliases.

### `9000_read_models/9002_read_models__category.sql`

- Reserved for cross-domain category read models. Domain-owned `category_list_view` remains in `0200_category/0205_category__views.sql`.

### `9000_read_models/9003_read_models__inventory.sql`

- Reserved for cross-domain inventory read models. Domain-owned inventory views remain in `0600_inventory/0605_inventory__views.sql`.

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

Create a complete final-schema inventory from Drizzle models and the effective end state of existing migration files:

```text
object type -> object name -> owning domain -> target canonical file -> complete final DDL attributes
```

Classify final objects by owner:

- `CREATE SCHEMA`, `CREATE TYPE`, extensions -> foundation;
- `CREATE TABLE` -> entity owner;
- constraints -> table owner unless it is a join table;
- indexes -> indexed table owner;
- final view definitions -> read model owner;

The inventory must describe the target final schema only. Do not keep objects that were created only to be dropped or renamed by later historical migrations.

The inventory is complete only when it records all final DDL attributes needed to recreate the schema:

- table columns with PostgreSQL type, nullability, defaults, identity/sequence behavior, enum schema, array/json details, and intentionally omitted historical columns;
- primary keys, unique constraints, foreign keys, check constraints, and exclusion constraints with exact names, ordered columns/expressions, referenced objects, `ON DELETE`/`ON UPDATE`, and deferrability options;
- indexes with exact names, uniqueness, method, ordered columns/expressions, operator classes, included columns, partial predicates, sort order, and null ordering;
- views with exact final SQL, output aliases, and dependency order;
- enum types with ordered values;
- extensions, helper functions, sequences, and other schema-level objects if present;
- object owner file and the reason for placing cross-domain views under `9000_read_models`.

Do not start Phase 2 until every object listed in the old effective schema and every runtime Drizzle model object is either assigned to a canonical file or explicitly recorded as historical churn that must not appear in the baseline.

Keep the inventory document or generated report in `services/catalog/docs/` until the baseline is reviewed.

### Phase 2: Create Structured Baseline SQL

Move old root migration files to `migrations/legacy-drizzle/` for audit history.

Create new canonical baseline files under `migrations/domains/**`.

Rules:

- create the final schema directly from scratch;
- use the complete final-schema inventory as the SQL contract, including types, nullability, defaults, constraints, index predicates, and final view definitions;
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
- compare schema-only dump against the current Drizzle-generated baseline, including table columns, types, nullability, defaults, enum values, constraints, indexes, partial predicates, and view definitions.

Existing fully migrated database:

- start with old Drizzle/applied migration state;
- run new catalog runner;
- verify no historical DDL is rerun;
- verify `catalog.pgmigrations` now contains structured basenames from aliases;
- verify no duplicate objects or failed `CREATE` statements;
- verify the resulting schema still matches the complete final-schema inventory.

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
- The final-schema inventory is complete enough to recreate the schema without consulting old Drizzle migration history.
- Fresh catalog schema matches the accepted final inventory for column types, nullability, defaults, enum values, constraints, indexes, partial predicates, and views.
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
