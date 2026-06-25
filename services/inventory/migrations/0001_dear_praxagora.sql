CREATE TABLE "inventory"."inventory_item_catalog_projection" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_handle" text,
	"external_system" text,
	"external_id" text,
	"catalog_revision" integer,
	"last_catalog_event_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_item_catalog_projection_project_variant_key" UNIQUE("project_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."inventory_product_translation" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "inventory_product_translation_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
CREATE INDEX "idx_inventory_item_catalog_projection_project_product" ON "inventory"."inventory_item_catalog_projection" USING btree ("project_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_item_catalog_projection_project_deleted" ON "inventory"."inventory_item_catalog_projection" USING btree ("project_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_inventory_product_translation_project" ON "inventory"."inventory_product_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_product_translation_project_locale" ON "inventory"."inventory_product_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_inventory_product_translation_project_locale_name" ON "inventory"."inventory_product_translation" USING btree ("project_id","locale","name");--> statement-breakpoint
CREATE VIEW "inventory"."inventory_item_list_all_stock_view" AS (
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      projection.product_id,
      projection.product_handle,
      translation.locale,
      translation.name AS product_name,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      projection.deleted_at,
      greatest(
        item.updated_at,
        coalesce(projection.updated_at, item.updated_at)
      ) AS updated_at,
      coalesce(stock.quantity_on_hand, 0)::integer AS quantity_on_hand,
      coalesce(stock.reserved_quantity, 0)::integer AS reserved_quantity,
      coalesce(stock.unavailable_quantity, 0)::integer AS unavailable_quantity,
      (
        coalesce(stock.quantity_on_hand, 0)
        - coalesce(stock.reserved_quantity, 0)
        - coalesce(stock.unavailable_quantity, 0)
      )::integer AS available_for_sale
    FROM inventory.inventory_item item
    JOIN inventory.inventory_item_catalog_projection projection
      ON projection.project_id = item.project_id
     AND projection.variant_id = item.variant_id
    JOIN inventory.inventory_product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = projection.product_id
    LEFT JOIN (
      SELECT
        project_id,
        variant_id,
        sum(quantity_on_hand)::integer AS quantity_on_hand,
        sum(reserved_qty)::integer AS reserved_quantity,
        sum(unavailable_qty)::integer AS unavailable_quantity
      FROM inventory.warehouse_stock
      GROUP BY project_id, variant_id
    ) stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
  );--> statement-breakpoint
CREATE VIEW "inventory"."inventory_item_list_warehouse_stock_view" AS (
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      projection.product_id,
      projection.product_handle,
      translation.locale,
      translation.name AS product_name,
      warehouse.id AS warehouse_scope_id,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      projection.deleted_at,
      greatest(
        item.updated_at,
        coalesce(projection.updated_at, item.updated_at)
      ) AS updated_at,
      coalesce(stock.quantity_on_hand, 0)::integer AS quantity_on_hand,
      coalesce(stock.reserved_qty, 0)::integer AS reserved_quantity,
      coalesce(stock.unavailable_qty, 0)::integer AS unavailable_quantity,
      (
        coalesce(stock.quantity_on_hand, 0)
        - coalesce(stock.reserved_qty, 0)
        - coalesce(stock.unavailable_qty, 0)
      )::integer AS available_for_sale
    FROM inventory.inventory_item item
    JOIN inventory.inventory_item_catalog_projection projection
      ON projection.project_id = item.project_id
     AND projection.variant_id = item.variant_id
    JOIN inventory.inventory_product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = projection.product_id
    JOIN inventory.warehouses warehouse
      ON warehouse.project_id = item.project_id
    LEFT JOIN inventory.warehouse_stock stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
     AND stock.warehouse_id = warehouse.id
  );