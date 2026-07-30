-- Up Migration

CREATE VIEW "catalog"."listing_list_view" AS
SELECT
  registry.store_id,
  registry.id,
  product.vendor_id,
  registry.handle,
  registry.published_at,
  registry.created_at,
  registry.updated_at,
  registry.deleted_at,
  registry.revision,
  product_translation.locale,
  product_translation.name,
  product_price_range.currency,
  product_price_range.min_amount_minor,
  product_price_range.max_amount_minor,
  product_price_range.min_amount_minor AS min_price_minor,
  product_price_range.max_amount_minor AS max_price_minor,
  product_category.category_id AS primary_category_id,
  category_translation.name AS primary_category_name,
  vendor.name AS brand_name
FROM "catalog"."entity_registry" registry
INNER JOIN "catalog"."product" product
  ON product.id = registry.id
INNER JOIN "catalog"."product_translation" product_translation
  ON product_translation.store_id = registry.store_id
 AND product_translation.product_id = registry.id
LEFT JOIN "catalog"."product_price_range" product_price_range
  ON product_price_range.store_id = registry.store_id
 AND product_price_range.product_id = registry.id
LEFT JOIN "catalog"."product_category" product_category
  ON product_category.store_id = registry.store_id
 AND product_category.product_id = registry.id
 AND product_category.is_primary = true
LEFT JOIN "catalog"."category_translation" category_translation
  ON category_translation.store_id = registry.store_id
 AND category_translation.category_id = product_category.category_id
 AND category_translation.locale = product_translation.locale
LEFT JOIN "catalog"."vendor" vendor
  ON vendor.store_id = registry.store_id
 AND vendor.id = product.vendor_id
WHERE registry.entity_type = 'PRODUCT';
