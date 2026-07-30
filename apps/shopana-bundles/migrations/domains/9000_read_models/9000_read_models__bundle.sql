-- Up Migration

CREATE VIEW "app_shopana_bundles"."bundle_list_view" AS
SELECT
  product.store_id,
  product.id,
  product.vendor_id,
  product.handle,
  product.published_at,
  product.created_at,
  product.updated_at,
  product.deleted_at,
  product.revision,
  product.kind,
  product_translation.locale,
  product_translation.name,
  product_price_range.currency,
  product_price_range.min_amount_minor,
  product_price_range.max_amount_minor,
  product_price_range.min_amount_minor AS min_price_minor,
  product_price_range.max_amount_minor AS max_price_minor,
  product_category.category_id AS primary_category_id,
  category_translation.name AS primary_category_name,
  vendor.name AS brand_name,
  bundle.type AS bundle_type
FROM "catalog"."product" product
INNER JOIN "catalog"."product_translation" product_translation
  ON product_translation.store_id = product.store_id
 AND product_translation.product_id = product.id
LEFT JOIN "catalog"."product_price_range" product_price_range
  ON product_price_range.store_id = product.store_id
 AND product_price_range.product_id = product.id
LEFT JOIN "catalog"."product_category" product_category
  ON product_category.store_id = product.store_id
 AND product_category.product_id = product.id
 AND product_category.is_primary = true
LEFT JOIN "catalog"."category_translation" category_translation
  ON category_translation.store_id = product.store_id
 AND category_translation.category_id = product_category.category_id
 AND category_translation.locale = product_translation.locale
LEFT JOIN "catalog"."vendor" vendor
  ON vendor.store_id = product.store_id
 AND vendor.id = product.vendor_id
LEFT JOIN "app_shopana_bundles"."bundle" bundle
  ON bundle.store_id = product.store_id
 AND bundle.product_id = product.id
WHERE product.kind = 'BUNDLE';
