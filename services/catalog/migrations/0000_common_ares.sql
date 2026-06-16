CREATE SCHEMA "catalog";
--> statement-breakpoint
CREATE TYPE "catalog"."currency" AS ENUM('UAH', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "catalog"."bulk_edit_job_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "catalog"."bulk_edit_cancel_reason" AS ENUM('USER', 'SUPERSEDED', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "catalog"."bulk_edit_item_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SUPERSEDED');--> statement-breakpoint
CREATE TABLE "catalog"."product" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" varchar(255),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_published_requires_handle" CHECK (published_at IS NULL OR handle IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "catalog"."variant" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"handle" varchar(255) NOT NULL,
	"sku" varchar(64),
	"external_system" varchar(32),
	"external_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "variant_handle_required_if_not_default" CHECK (is_default = true OR length(handle) > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."category" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"path" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"handle" varchar(255) NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "category_published_requires_handle" CHECK (published_at IS NULL OR handle IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "catalog"."category_media" (
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "category_media_category_id_file_id_pk" PRIMARY KEY("category_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."category_translation" (
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"description_text" text,
	"description_html" text,
	"description_json" text,
	CONSTRAINT "category_translation_category_id_locale_pk" PRIMARY KEY("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_category" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_category_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."category_tag" (
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "category_tag_category_id_tag_id_pk" PRIMARY KEY("category_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_tag" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "product_tag_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."tag" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."tag_translation" (
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tag_translation_tag_id_locale_pk" PRIMARY KEY("tag_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."item_pricing" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"currency" "catalog"."currency" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"compare_at_minor" bigint,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_pricing_amount_minor_check" CHECK ("catalog"."item_pricing"."amount_minor" >= 0),
	CONSTRAINT "item_pricing_compare_at_minor_check" CHECK ("catalog"."item_pricing"."compare_at_minor" >= 0),
	CONSTRAINT "item_pricing_effective_interval_check" CHECK ("catalog"."item_pricing"."effective_to" IS NULL OR "catalog"."item_pricing"."effective_to" > "catalog"."item_pricing"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_option" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"display_type" varchar(32) NOT NULL,
	CONSTRAINT "product_option_product_id_slug_key" UNIQUE("product_id","slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_option_swatch" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"color_one" varchar(32),
	"color_two" varchar(32),
	"image_id" uuid,
	"swatch_type" varchar(32) NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_option_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"swatch_id" uuid,
	"slug" varchar(255) NOT NULL,
	"sort_index" integer NOT NULL,
	CONSTRAINT "product_option_value_option_id_slug_key" UNIQUE("option_id","slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_option_variant_link" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"option_value_id" uuid,
	CONSTRAINT "product_option_variant_link_variant_id_option_id_pk" PRIMARY KEY("variant_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_feature" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"index" integer[] NOT NULL,
	"is_group" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	CONSTRAINT "product_feature_product_id_index_uniq" UNIQUE("product_id","index"),
	CONSTRAINT "feature_group_no_parent" CHECK ("catalog"."product_feature"."is_group" = false OR "catalog"."product_feature"."parent_id" IS NULL),
	CONSTRAINT "feature_index_not_empty" CHECK (array_length("catalog"."product_feature"."index", 1) > 0),
	CONSTRAINT "feature_group_root_only" CHECK ("catalog"."product_feature"."is_group" = false OR array_length("catalog"."product_feature"."index", 1) = 1)
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_feature_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"index" integer NOT NULL,
	CONSTRAINT "product_feature_value_feature_id_index_uniq" UNIQUE("feature_id","index")
);
--> statement-breakpoint
CREATE TABLE "catalog"."variant_media" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_media_variant_id_file_id_pk" PRIMARY KEY("variant_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_feature_translation" (
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_feature_translation_feature_id_locale_pk" PRIMARY KEY("feature_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_feature_value_translation" (
	"project_id" uuid NOT NULL,
	"feature_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_feature_value_translation_feature_value_id_locale_pk" PRIMARY KEY("feature_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_option_translation" (
	"project_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_option_translation_option_id_locale_pk" PRIMARY KEY("option_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_option_value_translation" (
	"project_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_option_value_translation_option_value_id_locale_pk" PRIMARY KEY("option_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_translation" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"title" text NOT NULL,
	"description_text" text,
	"description_html" text,
	"description_json" jsonb,
	"excerpt" text,
	CONSTRAINT "product_translation_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."variant_translation" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"title" text,
	CONSTRAINT "variant_translation_variant_id_locale_pk" PRIMARY KEY("variant_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_seo" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"og_title" varchar(95),
	"og_description" text,
	"og_image_id" uuid,
	CONSTRAINT "product_seo_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."bulk_edit_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"status" "catalog"."bulk_edit_job_status" DEFAULT 'QUEUED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog"."bulk_edit_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"op_type" text NOT NULL,
	"op_index" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"params" jsonb NOT NULL,
	"status" "catalog"."bulk_edit_item_status" DEFAULT 'PENDING' NOT NULL,
	"fence_token" text NOT NULL,
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"cancel_reason" "catalog"."bulk_edit_cancel_reason",
	"superseded_by_job_id" uuid,
	"errors" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_bulk_fence" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"fence_token" text NOT NULL,
	"job_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_bulk_fence_project_id_product_id_pk" PRIMARY KEY("project_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "catalog"."variant" ADD CONSTRAINT "variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."category_media" ADD CONSTRAINT "category_media_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."category_translation" ADD CONSTRAINT "category_translation_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_category" ADD CONSTRAINT "product_category_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_category" ADD CONSTRAINT "product_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."category_tag" ADD CONSTRAINT "category_tag_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."category_tag" ADD CONSTRAINT "category_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "catalog"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_tag" ADD CONSTRAINT "product_tag_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_tag" ADD CONSTRAINT "product_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "catalog"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."tag_translation" ADD CONSTRAINT "tag_translation_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "catalog"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."item_pricing" ADD CONSTRAINT "item_pricing_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option" ADD CONSTRAINT "product_option_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_value" ADD CONSTRAINT "product_option_value_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "catalog"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_value" ADD CONSTRAINT "product_option_value_swatch_id_product_option_swatch_id_fk" FOREIGN KEY ("swatch_id") REFERENCES "catalog"."product_option_swatch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_variant_link" ADD CONSTRAINT "product_option_variant_link_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_variant_link" ADD CONSTRAINT "product_option_variant_link_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "catalog"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_variant_link" ADD CONSTRAINT "product_option_variant_link_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "catalog"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature" ADD CONSTRAINT "product_feature_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature" ADD CONSTRAINT "product_feature_parent_id_product_feature_id_fk" FOREIGN KEY ("parent_id") REFERENCES "catalog"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "catalog"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_media" ADD CONSTRAINT "variant_media_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_translation" ADD CONSTRAINT "product_feature_translation_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "catalog"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_value_translation" ADD CONSTRAINT "product_feature_value_translation_feature_value_id_product_feature_value_id_fk" FOREIGN KEY ("feature_value_id") REFERENCES "catalog"."product_feature_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_translation" ADD CONSTRAINT "product_option_translation_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "catalog"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_value_translation" ADD CONSTRAINT "product_option_value_translation_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "catalog"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_translation" ADD CONSTRAINT "product_translation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_translation" ADD CONSTRAINT "variant_translation_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_seo" ADD CONSTRAINT "product_seo_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bulk_edit_item" ADD CONSTRAINT "bulk_edit_item_job_id_bulk_edit_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "catalog"."bulk_edit_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_bulk_fence" ADD CONSTRAINT "product_bulk_fence_job_id_bulk_edit_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "catalog"."bulk_edit_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_project_id_handle_key" ON "catalog"."product" USING btree ("project_id","handle") WHERE deleted_at IS NULL AND handle IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_product_project_id" ON "catalog"."product" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_created_at" ON "catalog"."product" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_product_updated_at" ON "catalog"."product" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_product_deleted_at" ON "catalog"."product" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_product_revision" ON "catalog"."product" USING btree ("id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_id_default_key" ON "catalog"."variant" USING btree ("product_id") WHERE is_default = true AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_id_handle_key" ON "catalog"."variant" USING btree ("product_id","handle") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_project_id_sku_key" ON "catalog"."variant" USING btree ("project_id","sku") WHERE deleted_at IS NULL AND sku IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_project_id_external_system_external_id_key" ON "catalog"."variant" USING btree ("project_id","external_system","external_id") WHERE deleted_at IS NULL AND external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_variant_project_id" ON "catalog"."variant" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_product_id" ON "catalog"."variant" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_product_active" ON "catalog"."variant" USING btree ("product_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_variant_created_at" ON "catalog"."variant" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_variant_updated_at" ON "catalog"."variant" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_variant_deleted_at" ON "catalog"."variant" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "category_project_id_handle_key" ON "catalog"."category" USING btree ("project_id","handle") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_category_project_id" ON "catalog"."category" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_parent_id" ON "catalog"."category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_category_path" ON "catalog"."category" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_category_published" ON "catalog"."category" USING btree ("project_id","published_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_category_media_category" ON "catalog"."category_media" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_translation_project" ON "catalog"."category_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_translation_project_locale" ON "catalog"."category_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_category_primary" ON "catalog"."product_category" USING btree ("product_id") WHERE is_primary = true;--> statement-breakpoint
CREATE INDEX "idx_product_category_product" ON "catalog"."product_category" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_category_category" ON "catalog"."product_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_tag_category" ON "catalog"."category_tag" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_tag_tag" ON "catalog"."category_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_product_tag_product" ON "catalog"."product_tag" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_tag_tag" ON "catalog"."product_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_project_id_handle_key" ON "catalog"."tag" USING btree ("project_id","handle");--> statement-breakpoint
CREATE INDEX "idx_tag_project_id" ON "catalog"."tag" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tag_translation_project" ON "catalog"."tag_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_variant_currency_effective_from" ON "catalog"."item_pricing" USING btree ("project_id","variant_id","currency","effective_from");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_variant_effective_from" ON "catalog"."item_pricing" USING btree ("project_id","variant_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_recorded_at" ON "catalog"."item_pricing" USING btree ("project_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_effective_to" ON "catalog"."item_pricing" USING btree ("project_id","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_item_pricing_current_unique" ON "catalog"."item_pricing" USING btree ("project_id","variant_id","currency") WHERE effective_to IS NULL;--> statement-breakpoint
CREATE INDEX "idx_product_option_product_id" ON "catalog"."product_option" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_swatch_project_id" ON "catalog"."product_option_swatch" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_option_id" ON "catalog"."product_option_value" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_variant_link_project_id" ON "catalog"."product_option_variant_link" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "product_feature_sort_idx" ON "catalog"."product_feature" USING btree ("product_id","index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_product_id" ON "catalog"."product_feature" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_feature_children_idx" ON "catalog"."product_feature" USING btree ("product_id","parent_id","index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_feature_id" ON "catalog"."product_feature_value" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_project" ON "catalog"."variant_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_variant" ON "catalog"."variant_media" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_file" ON "catalog"."variant_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_sort" ON "catalog"."variant_media" USING btree ("variant_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_translation_project" ON "catalog"."product_feature_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_translation_project" ON "catalog"."product_feature_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_translation_project" ON "catalog"."product_option_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_translation_project" ON "catalog"."product_option_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project" ON "catalog"."product_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project_locale" ON "catalog"."product_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_variant_translation_project" ON "catalog"."variant_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_seo_project" ON "catalog"."product_seo" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_seo_project_locale" ON "catalog"."product_seo" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "bulk_edit_job_project_created_idx" ON "catalog"."bulk_edit_job" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "bulk_edit_job_project_status_idx" ON "catalog"."bulk_edit_job" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "bulk_edit_item_project_product_status_idx" ON "catalog"."bulk_edit_item" USING btree ("project_id","product_id","status");--> statement-breakpoint
CREATE INDEX "bulk_edit_item_job_chunk_op_idx" ON "catalog"."bulk_edit_item" USING btree ("job_id","chunk_index","op_index");--> statement-breakpoint
CREATE INDEX "bulk_edit_item_job_status_idx" ON "catalog"."bulk_edit_item" USING btree ("job_id","status");--> statement-breakpoint
CREATE VIEW "catalog"."variant_prices_current" AS (select "id", "project_id", "variant_id", "currency", "amount_minor", "compare_at_minor", "effective_from", "effective_to", "recorded_at" from "catalog"."item_pricing" where "catalog"."item_pricing"."effective_to" IS NULL);