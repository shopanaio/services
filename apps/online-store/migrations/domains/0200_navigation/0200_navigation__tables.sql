-- Up Migration

CREATE TABLE "app_shopana_online_store"."navigation_menus" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "handle" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "revision" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "navigation_menus_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id"),
  CONSTRAINT "navigation_menus_handle_not_empty_check"
    CHECK (btrim("handle") <> ''),
  CONSTRAINT "navigation_menus_name_not_empty_check"
    CHECK (btrim("name") <> ''),
  CONSTRAINT "navigation_menus_revision_check"
    CHECK ("revision" >= 0)
);

CREATE UNIQUE INDEX "navigation_menus_store_handle_key"
  ON "app_shopana_online_store"."navigation_menus" ("store_id", "handle")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "navigation_menus_installation_idx"
  ON "app_shopana_online_store"."navigation_menus" ("installation_id");

CREATE INDEX "navigation_menus_store_idx"
  ON "app_shopana_online_store"."navigation_menus" ("store_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "app_shopana_online_store"."navigation_menu_items" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "menu_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "parent_id" uuid,
  "lexo_rank" varchar(64) NOT NULL,
  "target_type" varchar(64) NOT NULL,
  "target_id" uuid,
  "url" text,
  "open_in_new_tab" boolean DEFAULT false NOT NULL,
  "revision" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "navigation_menu_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "navigation_menu_items_menu_id_id_key" UNIQUE ("menu_id", "id"),
  CONSTRAINT "navigation_menu_items_menu_id_navigation_menus_id_fk"
    FOREIGN KEY ("menu_id")
    REFERENCES "app_shopana_online_store"."navigation_menus" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "navigation_menu_items_parent_fk"
    FOREIGN KEY ("menu_id", "parent_id")
    REFERENCES "app_shopana_online_store"."navigation_menu_items" ("menu_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "navigation_menu_items_parent_not_self_check"
    CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
  CONSTRAINT "navigation_menu_items_lexo_rank_not_empty_check"
    CHECK (btrim("lexo_rank") <> ''),
  CONSTRAINT "navigation_menu_items_target_type_check"
    CHECK ("target_type" ~ '^[A-Z][A-Z0-9_]*$'),
  CONSTRAINT "navigation_menu_items_target_check"
    CHECK (
      (
        "target_type" = 'URL'
        AND "target_id" IS NULL
        AND "url" IS NOT NULL
        AND btrim("url") <> ''
      )
      OR
      (
        "target_type" <> 'URL'
        AND "target_id" IS NOT NULL
        AND "url" IS NULL
      )
    ),
  CONSTRAINT "navigation_menu_items_revision_check"
    CHECK ("revision" >= 0)
);

CREATE INDEX "navigation_menu_items_tree_idx"
  ON "app_shopana_online_store"."navigation_menu_items" (
    "menu_id",
    "parent_id",
    "lexo_rank",
    "id"
  );

CREATE INDEX "navigation_menu_items_target_idx"
  ON "app_shopana_online_store"."navigation_menu_items" (
    "store_id",
    "target_type",
    "target_id"
  );

CREATE FUNCTION "app_shopana_online_store"."assert_navigation_menu_item_acyclic"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."parent_id" IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    WITH RECURSIVE "ancestors" ("id", "parent_id") AS (
      SELECT "item"."id", "item"."parent_id"
      FROM "app_shopana_online_store"."navigation_menu_items" AS "item"
      WHERE "item"."menu_id" = NEW."menu_id"
        AND "item"."id" = NEW."parent_id"

      UNION

      SELECT "item"."id", "item"."parent_id"
      FROM "app_shopana_online_store"."navigation_menu_items" AS "item"
      INNER JOIN "ancestors"
        ON "ancestors"."parent_id" = "item"."id"
      WHERE "item"."menu_id" = NEW."menu_id"
    )
    SELECT 1
    FROM "ancestors"
    WHERE "id" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'navigation menu item hierarchy cannot contain a cycle';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "navigation_menu_items_acyclic_trigger"
BEFORE INSERT OR UPDATE OF "menu_id", "parent_id"
ON "app_shopana_online_store"."navigation_menu_items"
FOR EACH ROW
EXECUTE FUNCTION "app_shopana_online_store"."assert_navigation_menu_item_acyclic"();

CREATE TABLE "app_shopana_online_store"."navigation_menu_item_translations" (
  "item_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "locale" "app_shopana_online_store"."locale_code" NOT NULL,
  "label" varchar(255) NOT NULL,
  CONSTRAINT "navigation_menu_item_translations_pkey"
    PRIMARY KEY ("item_id", "locale"),
  CONSTRAINT "navigation_menu_item_translations_item_id_items_id_fk"
    FOREIGN KEY ("item_id")
    REFERENCES "app_shopana_online_store"."navigation_menu_items" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "navigation_menu_item_translations_label_not_empty_check"
    CHECK (btrim("label") <> '')
);

CREATE INDEX "navigation_menu_item_translations_store_locale_idx"
  ON "app_shopana_online_store"."navigation_menu_item_translations" (
    "store_id",
    "locale"
  );
