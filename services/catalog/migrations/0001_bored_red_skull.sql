DROP VIEW "catalog"."product_list_view";--> statement-breakpoint
DROP VIEW "catalog"."variant_warehouse_candidate_view";--> statement-breakpoint
CREATE VIEW "catalog"."bundle_list_view" AS (select "catalog"."product"."project_id", "catalog"."product"."id", "catalog"."product"."vendor_id", "catalog"."product"."handle", "catalog"."product"."published_at", "catalog"."product"."created_at", "catalog"."product"."updated_at", "catalog"."product"."deleted_at", "catalog"."product"."revision", "catalog"."product"."kind", "catalog"."product_translation"."locale", "catalog"."product_translation"."name", "product_price_range"."currency", "min_amount_minor" as "min_price_minor", "max_amount_minor" as "max_price_minor", "catalog"."product_category"."category_id" as "primary_category_id", "catalog"."category_translation"."name" as "primary_category_name", "catalog"."vendor"."name" as "brand_name" from "catalog"."product" inner join "catalog"."product_translation" on "catalog"."product_translation"."project_id" = "catalog"."product"."project_id" AND "catalog"."product_translation"."product_id" = "catalog"."product"."id" left join "catalog"."product_price_range" on "product_price_range"."project_id" = "catalog"."product"."project_id" AND "product_price_range"."product_id" = "catalog"."product"."id" left join "catalog"."product_category" on "catalog"."product_category"."project_id" = "catalog"."product"."project_id" AND "catalog"."product_category"."product_id" = "catalog"."product"."id" AND "catalog"."product_category"."is_primary" = true left join "catalog"."category_translation" on "catalog"."category_translation"."project_id" = "catalog"."product"."project_id" AND "catalog"."category_translation"."category_id" = "catalog"."product_category"."category_id" AND "catalog"."category_translation"."locale" = "catalog"."product_translation"."locale" left join "catalog"."vendor" on "catalog"."vendor"."project_id" = "catalog"."product"."project_id" AND "catalog"."vendor"."id" = "catalog"."product"."vendor_id" where "catalog"."product"."kind" = 'BUNDLE');--> statement-breakpoint
CREATE VIEW "catalog"."product_list_view" AS (select "catalog"."product"."project_id", "catalog"."product"."id", "catalog"."product"."vendor_id", "catalog"."product"."handle", "catalog"."product"."published_at", "catalog"."product"."created_at", "catalog"."product"."updated_at", "catalog"."product"."deleted_at", "catalog"."product"."revision", "catalog"."product"."kind", "catalog"."product_translation"."locale", "catalog"."product_translation"."name", "product_price_range"."currency", "min_amount_minor" as "min_price_minor", "max_amount_minor" as "max_price_minor", "catalog"."product_category"."category_id" as "primary_category_id", "catalog"."category_translation"."name" as "primary_category_name", "catalog"."vendor"."name" as "brand_name" from "catalog"."product" inner join "catalog"."product_translation" on "catalog"."product_translation"."project_id" = "catalog"."product"."project_id" AND "catalog"."product_translation"."product_id" = "catalog"."product"."id" left join "catalog"."product_price_range" on "product_price_range"."project_id" = "catalog"."product"."project_id" AND "product_price_range"."product_id" = "catalog"."product"."id" left join "catalog"."product_category" on "catalog"."product_category"."project_id" = "catalog"."product"."project_id" AND "catalog"."product_category"."product_id" = "catalog"."product"."id" AND "catalog"."product_category"."is_primary" = true left join "catalog"."category_translation" on "catalog"."category_translation"."project_id" = "catalog"."product"."project_id" AND "catalog"."category_translation"."category_id" = "catalog"."product_category"."category_id" AND "catalog"."category_translation"."locale" = "catalog"."product_translation"."locale" left join "catalog"."vendor" on "catalog"."vendor"."project_id" = "catalog"."product"."project_id" AND "catalog"."vendor"."id" = "catalog"."product"."vendor_id" where "catalog"."product"."kind" = 'BASE');--> statement-breakpoint
CREATE VIEW "catalog"."variant_warehouse_candidate_view" AS (
    SELECT
      variant.project_id,
      warehouse.id AS warehouse_scope_id,
      variant.product_id,
      variant.kind,
      translation.locale,
      translation.name AS product_name,
      variant.id,
      variant.is_default,
      variant.handle,
      variant.sku,
      variant.external_system,
      variant.external_id,
      variant.updated_at,
      variant.created_at,
      variant.deleted_at,
      product.deleted_at AS product_deleted_at,
      item.id AS inventory_item_id
    FROM catalog.variant variant
    JOIN catalog.product product
      ON product.project_id = variant.project_id
     AND product.id = variant.product_id
    JOIN catalog.warehouses warehouse
      ON warehouse.project_id = variant.project_id
    JOIN catalog.product_translation translation
      ON translation.project_id = variant.project_id
     AND translation.product_id = product.id
    LEFT JOIN catalog.inventory_item item
      ON item.project_id = variant.project_id
     AND item.variant_id = variant.id
    LEFT JOIN catalog.warehouse_stock stock
      ON stock.project_id = variant.project_id
     AND stock.variant_id = variant.id
     AND stock.warehouse_id = warehouse.id
    WHERE stock.id IS NULL
      AND variant.kind = 'BASE'
  );