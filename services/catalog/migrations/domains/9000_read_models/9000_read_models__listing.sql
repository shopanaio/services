-- Up Migration

CREATE VIEW "catalog"."listing_list_view" AS
SELECT
  product.project_id,
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
  vendor.name AS brand_name
FROM "catalog"."product" product
INNER JOIN "catalog"."product_translation" product_translation
  ON product_translation.project_id = product.project_id
 AND product_translation.product_id = product.id
LEFT JOIN "catalog"."product_price_range" product_price_range
  ON product_price_range.project_id = product.project_id
 AND product_price_range.product_id = product.id
LEFT JOIN "catalog"."product_category" product_category
  ON product_category.project_id = product.project_id
 AND product_category.product_id = product.id
 AND product_category.is_primary = true
LEFT JOIN "catalog"."category_translation" category_translation
  ON category_translation.project_id = product.project_id
 AND category_translation.category_id = product_category.category_id
 AND category_translation.locale = product_translation.locale
LEFT JOIN "catalog"."vendor" vendor
  ON vendor.project_id = product.project_id
 AND vendor.id = product.vendor_id;
