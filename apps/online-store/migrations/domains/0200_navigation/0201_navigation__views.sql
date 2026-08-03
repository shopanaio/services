-- Up Migration

CREATE VIEW "app_shopana_online_store"."navigation_menu_list_view" AS
SELECT
  navigation_menu.installation_id,
  navigation_menu.store_id,
  navigation_menu.id,
  navigation_menu.handle,
  navigation_menu.name,
  navigation_menu.revision,
  navigation_menu.created_at,
  navigation_menu.updated_at,
  navigation_menu.deleted_at
FROM "app_shopana_online_store"."navigation_menus" navigation_menu;
