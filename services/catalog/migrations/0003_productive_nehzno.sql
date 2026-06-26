CREATE VIEW "catalog"."variant_warehouse_candidate_view" AS (
    SELECT
      variant.project_id,
      warehouse.id AS warehouse_scope_id,
      variant.product_id,
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
  );