-- Up Migration

CREATE VIEW "catalog"."category_list_view" AS
SELECT
  category.store_id,
  category.id,
  category.parent_id,
  category.path,
  category.depth,
  category.handle,
  category.default_sort,
  category.default_sort_direction,
  category.published_at,
  category.created_at,
  category.updated_at,
  category.deleted_at,
  category.revision,
  category.products_count,
  category_translation.locale,
  category_translation.name
FROM "catalog"."category" category
INNER JOIN "catalog"."category_translation" category_translation
  ON category_translation.store_id = category.store_id
 AND category_translation.category_id = category.id;

CREATE VIEW "catalog"."tag_list_view" AS
SELECT
  tag.store_id,
  tag.id,
  tag.handle,
  tag.created_at,
  tag.products_count,
  tag_translation.locale,
  tag_translation.name
FROM "catalog"."tag" tag
INNER JOIN "catalog"."tag_translation" tag_translation
  ON tag_translation.store_id = tag.store_id
 AND tag_translation.tag_id = tag.id;
