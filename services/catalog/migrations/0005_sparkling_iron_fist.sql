CREATE TABLE "catalog"."bundle_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"min_selection" integer,
	"max_selection" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"ref_product_id" uuid,
	"ref_variant_id" uuid,
	"title" varchar(255),
	"featured_image_id" uuid,
	"excluded_variant_ids" jsonb,
	"min_qty" integer DEFAULT 1,
	"max_qty" integer,
	"default_qty" integer DEFAULT 1,
	"price_type" varchar(32),
	"price_value" integer,
	"pricing_template_id" uuid,
	"visible" boolean DEFAULT true NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_pricing_template" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"price_type" varchar(32) NOT NULL,
	"price_value" integer,
	"sort_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."condition" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"category" varchar(32) NOT NULL,
	"subject" varchar(32) NOT NULL,
	"operator" varchar(32) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" uuid NOT NULL,
	"value" integer,
	"sort_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."condition_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"logic_operator" varchar(8) DEFAULT 'AND' NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."dependency_action" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"action_type" varchar(32) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" uuid,
	"required_value" boolean,
	"price_type" varchar(32),
	"price_value" integer,
	"stackable" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."dependency_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"logic_operator" varchar(8) DEFAULT 'AND' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item" ADD CONSTRAINT "bundle_item_group_id_bundle_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."bundle_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item" ADD CONSTRAINT "bundle_item_pricing_template_id_bundle_pricing_template_id_fk" FOREIGN KEY ("pricing_template_id") REFERENCES "catalog"."bundle_pricing_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."condition" ADD CONSTRAINT "condition_group_id_condition_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."condition_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."condition_group" ADD CONSTRAINT "condition_group_rule_id_dependency_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "catalog"."dependency_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."dependency_action" ADD CONSTRAINT "dependency_action_rule_id_dependency_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "catalog"."dependency_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bundle_group_product_id" ON "catalog"."bundle_group" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_group_sort" ON "catalog"."bundle_group" USING btree ("product_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_bundle_group_project_id" ON "catalog"."bundle_group" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_group_id" ON "catalog"."bundle_item" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_ref_product_id" ON "catalog"."bundle_item" USING btree ("ref_product_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_ref_variant_id" ON "catalog"."bundle_item" USING btree ("ref_variant_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_sort" ON "catalog"."bundle_item" USING btree ("group_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_project_id" ON "catalog"."bundle_item" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_pricing_template_product_id" ON "catalog"."bundle_pricing_template" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_pricing_template_project_id" ON "catalog"."bundle_pricing_template" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_condition_group_id" ON "catalog"."condition" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_condition_target" ON "catalog"."condition" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_condition_project_id" ON "catalog"."condition" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_condition_group_rule_id" ON "catalog"."condition_group" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_condition_group_project_id" ON "catalog"."condition_group" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_action_rule_id" ON "catalog"."dependency_action" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_action_target" ON "catalog"."dependency_action" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_action_project_id" ON "catalog"."dependency_action" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_rule_product_id" ON "catalog"."dependency_rule" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_rule_priority" ON "catalog"."dependency_rule" USING btree ("product_id","priority");--> statement-breakpoint
CREATE INDEX "idx_dependency_rule_project_id" ON "catalog"."dependency_rule" USING btree ("project_id");