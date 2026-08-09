-- Up Migration

ALTER TABLE "app_shopana_online_store"."navigation_menu_items"
  ADD COLUMN "handle" varchar(255) NOT NULL;

ALTER TABLE "app_shopana_online_store"."navigation_menu_items"
  ADD CONSTRAINT "navigation_menu_items_handle_not_empty_check"
  CHECK (btrim("handle") <> '');

CREATE UNIQUE INDEX "navigation_menu_items_root_handle_key"
  ON "app_shopana_online_store"."navigation_menu_items" ("menu_id", "handle")
  WHERE "parent_id" IS NULL;

CREATE UNIQUE INDEX "navigation_menu_items_parent_handle_key"
  ON "app_shopana_online_store"."navigation_menu_items" (
    "menu_id",
    "parent_id",
    "handle"
  )
  WHERE "parent_id" IS NOT NULL;
