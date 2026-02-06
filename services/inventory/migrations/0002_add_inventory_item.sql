CREATE TABLE "inventory"."inventory_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"sku" varchar(255),
	"track_inventory" boolean DEFAULT true NOT NULL,
	"continue_selling_when_out_of_stock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_item_variant_id_unique" UNIQUE("variant_id")
);
--> statement-breakpoint
CREATE INDEX "idx_inventory_item_variant" ON "inventory"."inventory_item" USING btree ("variant_id");
--> statement-breakpoint
CREATE INDEX "idx_inventory_item_project" ON "inventory"."inventory_item" USING btree ("project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_item_sku_unique" ON "inventory"."inventory_item" ("project_id","sku");
