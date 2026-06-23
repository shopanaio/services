CREATE TABLE "catalog"."vendor" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "vendor_project_id_id_unique" UNIQUE("project_id","id")
);
--> statement-breakpoint
ALTER TABLE "catalog"."product" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_project_id_name_key" ON "catalog"."vendor" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "idx_vendor_project_id" ON "catalog"."vendor" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "catalog"."product" ADD CONSTRAINT "product_vendor_fk" FOREIGN KEY ("project_id","vendor_id") REFERENCES "catalog"."vendor"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_vendor_id" ON "catalog"."product" USING btree ("vendor_id");