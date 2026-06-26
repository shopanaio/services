DROP VIEW IF EXISTS "catalog"."inventory_item_list_warehouse_stock_view";--> statement-breakpoint
CREATE VIEW "catalog"."inventory_item_list_warehouse_stock_view" AS (
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      product.id AS product_id,
      product.handle AS product_handle,
      translation.locale,
      translation.name AS product_name,
      stock.warehouse_id AS warehouse_scope_id,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      coalesce(variant.deleted_at, product.deleted_at) AS deleted_at,
      greatest(
        item.updated_at,
        product.updated_at,
        variant.updated_at
      ) AS updated_at,
      stock.quantity_on_hand::integer AS quantity_on_hand,
      stock.reserved_qty::integer AS reserved_quantity,
      stock.unavailable_qty::integer AS unavailable_quantity,
      (
        stock.quantity_on_hand
        - stock.reserved_qty
        - stock.unavailable_qty
      )::integer AS available_for_sale
    FROM catalog.inventory_item item
    JOIN catalog.variant variant
      ON variant.project_id = item.project_id
     AND variant.id = item.variant_id
    JOIN catalog.product product
      ON product.project_id = item.project_id
     AND product.id = variant.product_id
    JOIN catalog.product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = product.id
    JOIN catalog.warehouse_stock stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
  );
