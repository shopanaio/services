-- Up Migration

CREATE VIEW "catalog"."variant_warehouse_candidate_view" AS
SELECT
  variant.store_id,
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
FROM "catalog"."variant" variant
JOIN "catalog"."product" product
  ON product.store_id = variant.store_id
 AND product.id = variant.product_id
JOIN "catalog"."warehouses" warehouse
  ON warehouse.store_id = variant.store_id
JOIN "catalog"."product_translation" translation
  ON translation.store_id = variant.store_id
 AND translation.product_id = product.id
LEFT JOIN "catalog"."inventory_item" item
  ON item.store_id = variant.store_id
 AND item.variant_id = variant.id
LEFT JOIN "catalog"."warehouse_stock" stock
  ON stock.store_id = variant.store_id
 AND stock.variant_id = variant.id
 AND stock.warehouse_id = warehouse.id
WHERE stock.id IS NULL;

CREATE VIEW "catalog"."inventory_item_list_all_stock_view" AS
SELECT
  item.store_id,
  item.id,
  item.variant_id,
  product.id AS product_id,
  product.handle AS product_handle,
  translation.locale,
  translation.name AS product_name,
  item.sku,
  item.track_inventory,
  item.continue_selling_when_out_of_stock,
  coalesce(variant.deleted_at, product.deleted_at) AS deleted_at,
  greatest(
    item.updated_at,
    product.updated_at,
    variant.updated_at
  ) AS updated_at,
  coalesce(stock.quantity_on_hand, 0)::integer AS quantity_on_hand,
  coalesce(stock.reserved_quantity, 0)::integer AS reserved_quantity,
  coalesce(stock.unavailable_quantity, 0)::integer AS unavailable_quantity,
  (
    coalesce(stock.quantity_on_hand, 0)
    - coalesce(stock.reserved_quantity, 0)
    - coalesce(stock.unavailable_quantity, 0)
  )::integer AS available_for_sale
FROM "catalog"."inventory_item" item
JOIN "catalog"."variant" variant
  ON variant.store_id = item.store_id
 AND variant.id = item.variant_id
JOIN "catalog"."product" product
  ON product.store_id = item.store_id
 AND product.id = variant.product_id
JOIN "catalog"."product_translation" translation
  ON translation.store_id = item.store_id
 AND translation.product_id = product.id
LEFT JOIN (
  SELECT
    store_id,
    variant_id,
    sum(quantity_on_hand)::integer AS quantity_on_hand,
    sum(reserved_qty)::integer AS reserved_quantity,
    sum(unavailable_qty)::integer AS unavailable_quantity
  FROM "catalog"."warehouse_stock"
  GROUP BY store_id, variant_id
) stock
  ON stock.store_id = item.store_id
 AND stock.variant_id = item.variant_id;

CREATE VIEW "catalog"."inventory_item_list_warehouse_stock_view" AS
SELECT
  item.store_id,
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
FROM "catalog"."inventory_item" item
JOIN "catalog"."variant" variant
  ON variant.store_id = item.store_id
 AND variant.id = item.variant_id
JOIN "catalog"."product" product
  ON product.store_id = item.store_id
 AND product.id = variant.product_id
JOIN "catalog"."product_translation" translation
  ON translation.store_id = item.store_id
 AND translation.product_id = product.id
JOIN "catalog"."warehouse_stock" stock
  ON stock.store_id = item.store_id
 AND stock.variant_id = item.variant_id;
