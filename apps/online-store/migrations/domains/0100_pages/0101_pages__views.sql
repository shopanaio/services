-- Up Migration

CREATE VIEW "app_shopana_online_store"."page_list_view" AS
SELECT
  page.installation_id,
  page.store_id,
  page.id,
  page.handle,
  page.template_suffix,
  page.published_at,
  page.published_at IS NOT NULL AND page.published_at <= now() AS is_published,
  page.revision,
  page.created_at,
  page.updated_at,
  page.deleted_at,
  page_translation.locale,
  page_translation.title
FROM "app_shopana_online_store"."pages" page
INNER JOIN "app_shopana_online_store"."page_translations" page_translation
  ON page_translation.store_id = page.store_id
 AND page_translation.page_id = page.id;
