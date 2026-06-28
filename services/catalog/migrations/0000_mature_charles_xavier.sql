CREATE SCHEMA "catalog";
--> statement-breakpoint
CREATE TYPE "catalog"."product_kind" AS ENUM('BASE', 'BUNDLE');--> statement-breakpoint
CREATE TYPE "catalog"."currency" AS ENUM('UAH', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "catalog"."bulk_edit_job_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "catalog"."bulk_edit_cancel_reason" AS ENUM('USER', 'SUPERSEDED', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "catalog"."bulk_edit_item_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "catalog"."dimension_unit" AS ENUM('mm', 'cm', 'm', 'in', 'ft', 'yd');--> statement-breakpoint
CREATE TYPE "catalog"."weight_unit" AS ENUM('g', 'kg', 'lb', 'oz');--> statement-breakpoint
CREATE TYPE "catalog"."stock_apply_status" AS ENUM('APPLIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "catalog"."stock_movement_reason" AS ENUM('DAMAGE', 'INVENTORY_COUNT', 'MANUAL', 'CUSTOMER_RETURN');--> statement-breakpoint
CREATE TYPE "catalog"."stock_movement_type" AS ENUM('SEED', 'RECEIVE', 'SELL', 'RETURN', 'ADJUST', 'RESERVE', 'RELEASE', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "catalog"."stock_transfer_direction" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "catalog"."reservation_status" AS ENUM('ACTIVE', 'RELEASED', 'FULFILLED');--> statement-breakpoint
CREATE TABLE "catalog"."product" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"vendor_id" uuid,
	"handle" varchar(255),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"kind" "catalog"."product_kind" DEFAULT 'BASE' NOT NULL,
	CONSTRAINT "product_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "product_published_requires_handle" CHECK (published_at IS NULL OR handle IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "catalog"."variant" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" "catalog"."product_kind" DEFAULT 'BASE' NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"handle" varchar(255) NOT NULL,
	"sku" varchar(64),
	"external_system" varchar(32),
	"external_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "variant_project_id_product_id_id_unique" UNIQUE("project_id","product_id","id"),
	CONSTRAINT "variant_handle_required_if_not_default" CHECK (is_default = true OR length(handle) > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."vendor" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "vendor_project_id_id_unique" UNIQUE("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."category" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"path" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"handle" varchar(255) NOT NULL,
	"default_sort" varchar(32) DEFAULT 'manual' NOT NULL,
	"default_sort_direction" varchar(4) DEFAULT 'asc' NOT NULL,
	"published_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"products_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "category_published_requires_handle" CHECK (published_at IS NULL OR handle IS NOT NULL),
	CONSTRAINT "category_default_sort_check" CHECK (default_sort IN ('manual', 'price', 'newest', 'name')),
	CONSTRAINT "category_default_sort_direction_check" CHECK (default_sort_direction IN ('asc', 'desc'))
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
	"excerpt_text" text,
	"excerpt_html" text,
	"excerpt_json" text,
	CONSTRAINT "category_translation_category_id_locale_pk" PRIMARY KEY("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_category" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"lexo_rank" varchar(64) NOT NULL,
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
	"products_count" integer DEFAULT 0 NOT NULL,
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
	"sort_index" integer DEFAULT 0 NOT NULL,
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
	"slug" varchar(255) NOT NULL,
	"index" integer[] NOT NULL,
	"is_group" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	CONSTRAINT "product_feature_product_id_index_uniq" UNIQUE("product_id","index"),
	CONSTRAINT "product_feature_product_id_slug_uniq" UNIQUE("product_id","slug"),
	CONSTRAINT "feature_group_no_parent" CHECK ("catalog"."product_feature"."is_group" = false OR "catalog"."product_feature"."parent_id" IS NULL),
	CONSTRAINT "feature_index_not_empty" CHECK (array_length("catalog"."product_feature"."index", 1) > 0),
	CONSTRAINT "feature_group_root_only" CHECK ("catalog"."product_feature"."is_group" = false OR array_length("catalog"."product_feature"."index", 1) = 1)
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_feature_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"index" integer NOT NULL,
	CONSTRAINT "product_feature_value_feature_id_index_uniq" UNIQUE("feature_id","index"),
	CONSTRAINT "product_feature_value_feature_id_slug_uniq" UNIQUE("feature_id","slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_media" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_project_id_product_id_file_id_unique" UNIQUE("project_id","product_id","file_id"),
	CONSTRAINT "product_media_project_id_product_id_id_unique" UNIQUE("project_id","product_id","id"),
	CONSTRAINT "product_media_project_id_id_unique" UNIQUE("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."variant_media" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_media_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_media_project_id_variant_id_product_media_id_pk" PRIMARY KEY("project_id","variant_id","product_media_id")
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
	"name" text NOT NULL,
	"description_text" text,
	"description_html" text,
	"description_json" jsonb,
	"excerpt_text" text,
	"excerpt_html" text,
	"excerpt_json" jsonb,
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
CREATE TABLE "catalog"."category_seo" (
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"og_title" varchar(95),
	"og_description" text,
	"og_image_id" uuid,
	CONSTRAINT "category_seo_category_id_locale_pk" PRIMARY KEY("category_id","locale")
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
CREATE TABLE "catalog"."product_search_index" (
	"project_id" uuid NOT NULL,
	"product_id" uuid PRIMARY KEY NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"tag_handles" text[] DEFAULT '{}'::text[] NOT NULL,
	"feature_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"category_handles" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."variant_search_index" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"price_currency" varchar(3) NOT NULL,
	"price_minor" bigint,
	"in_stock" boolean DEFAULT false NOT NULL,
	"total_stock" integer DEFAULT 0 NOT NULL,
	"option_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"group_id" uuid,
	"facet_type" varchar(32) NOT NULL,
	"ui_type" varchar(16) DEFAULT 'checkbox' NOT NULL,
	"selection_mode" varchar(16) DEFAULT 'multi' NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"min_values" integer DEFAULT 1 NOT NULL,
	"max_values_visible" integer DEFAULT 10 NOT NULL,
	"value_sort" varchar(16) DEFAULT 'count' NOT NULL,
	"slug" varchar(255) NOT NULL,
	"indexable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facet_project_id_slug_uniq" UNIQUE("project_id","slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facet_group_project_id_sort_index_uniq" UNIQUE("project_id","sort_index")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_group_translation" (
	"group_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "facet_group_translation_group_id_locale_pk" PRIMARY KEY("group_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_swatch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"swatch_type" varchar(32) NOT NULL,
	"color_one" varchar(32),
	"color_two" varchar(32),
	"image_id" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_translation" (
	"facet_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "facet_translation_facet_id_locale_pk" PRIMARY KEY("facet_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"facet_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"swatch_id" uuid,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facet_value_facet_id_slug_uniq" UNIQUE("facet_id","slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_value_source_handle" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"facet_id" uuid NOT NULL,
	"facet_value_id" uuid NOT NULL,
	"facet_type" varchar(32) NOT NULL,
	"source_handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facet_value_source_handle_project_facet_source_uniq" UNIQUE("project_id","facet_id","source_handle"),
	CONSTRAINT "facet_value_source_handle_project_type_source_uniq" UNIQUE("project_id","facet_type","source_handle"),
	CONSTRAINT "facet_value_source_handle_value_source_uniq" UNIQUE("facet_value_id","source_handle")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_value_translation" (
	"facet_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "facet_value_translation_facet_value_id_locale_pk" PRIMARY KEY("facet_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."collection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"handle" varchar(255),
	"type" varchar(16) NOT NULL,
	"default_sort" varchar(32) DEFAULT 'newest' NOT NULL,
	"default_sort_direction" varchar(4) DEFAULT 'asc' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "collection_type_check" CHECK (type IN ('manual', 'rule')),
	CONSTRAINT "collection_default_sort_check" CHECK (default_sort IN ('manual', 'price', 'newest', 'name')),
	CONSTRAINT "collection_default_sort_direction_check" CHECK (default_sort_direction IN ('asc', 'desc')),
	CONSTRAINT "collection_rule_manual_sort_check" CHECK (type != 'rule' OR default_sort != 'manual'),
	CONSTRAINT "collection_effective_range_check" CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);
--> statement-breakpoint
CREATE TABLE "catalog"."collection_item" (
	"collection_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lexo_rank" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_item_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."collection_media" (
	"collection_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_media_collection_id_file_id_pk" PRIMARY KEY("collection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."collection_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"collection_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"field" varchar(64) NOT NULL,
	"operator" varchar(16) NOT NULL,
	"value" jsonb NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."collection_seo" (
	"collection_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"project_id" uuid NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"og_title" varchar(95),
	"og_description" text,
	"og_image_id" uuid,
	CONSTRAINT "collection_seo_collection_id_locale_pk" PRIMARY KEY("collection_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."collection_translation" (
	"collection_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description_text" text,
	"description_html" text,
	"description_json" text,
	"excerpt_text" text,
	"excerpt_html" text,
	"excerpt_json" text,
	CONSTRAINT "collection_translation_collection_id_locale_pk" PRIMARY KEY("collection_id","locale")
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
CREATE TABLE "catalog"."bundle" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"type" varchar(32),
	"display_style" varchar(32) DEFAULT 'ACCORDION' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bundle_display_style_check" CHECK ("catalog"."bundle"."display_style" IN ('ACCORDION', 'TABS', 'FLAT', 'WIZARD'))
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_configuration" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"bundle_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_configuration_variant" (
	"project_id" uuid NOT NULL,
	"configuration_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	CONSTRAINT "bundle_configuration_variant_configuration_id_variant_id_pk" PRIMARY KEY("configuration_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"configuration_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"min_selection" integer,
	"max_selection" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bundle_group_selection_check" CHECK ((
        ("catalog"."bundle_group"."min_selection" IS NULL OR "catalog"."bundle_group"."min_selection" >= 0)
        AND
        ("catalog"."bundle_group"."max_selection" IS NULL OR "catalog"."bundle_group"."max_selection" >= 0)
        AND
        ("catalog"."bundle_group"."min_selection" IS NULL OR "catalog"."bundle_group"."max_selection" IS NULL OR "catalog"."bundle_group"."max_selection" >= "catalog"."bundle_group"."min_selection")
      ))
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_group_translation" (
	"project_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "bundle_group_translation_group_id_locale_pk" PRIMARY KEY("group_id","locale")
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
	"featured_image_id" uuid,
	"min_qty" integer DEFAULT 1,
	"max_qty" integer,
	"default_qty" integer DEFAULT 1,
	"price_rule_id" uuid,
	"pricing_template_id" uuid,
	"visible" boolean DEFAULT true NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bundle_item_quantity_check" CHECK ((
        ("catalog"."bundle_item"."min_qty" IS NULL OR "catalog"."bundle_item"."min_qty" >= 0)
        AND
        ("catalog"."bundle_item"."default_qty" IS NULL OR "catalog"."bundle_item"."min_qty" IS NULL OR "catalog"."bundle_item"."default_qty" >= "catalog"."bundle_item"."min_qty")
        AND
        ("catalog"."bundle_item"."default_qty" IS NULL OR "catalog"."bundle_item"."max_qty" IS NULL OR "catalog"."bundle_item"."default_qty" <= "catalog"."bundle_item"."max_qty")
        AND
        ("catalog"."bundle_item"."max_qty" IS NULL OR "catalog"."bundle_item"."min_qty" IS NULL OR "catalog"."bundle_item"."max_qty" >= "catalog"."bundle_item"."min_qty")
      )),
	CONSTRAINT "bundle_item_reference_check" CHECK ((
        ("catalog"."bundle_item"."item_type" = 'PRODUCT' AND "catalog"."bundle_item"."ref_product_id" IS NOT NULL AND "catalog"."bundle_item"."ref_variant_id" IS NULL)
        OR
        ("catalog"."bundle_item"."item_type" = 'VARIANT' AND "catalog"."bundle_item"."ref_variant_id" IS NOT NULL AND "catalog"."bundle_item"."ref_product_id" IS NULL)
      )),
	CONSTRAINT "bundle_item_pricing_source_check" CHECK (NOT ("catalog"."bundle_item"."pricing_template_id" IS NOT NULL AND "catalog"."bundle_item"."price_rule_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_item_option_selection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"ref_option_id" uuid NOT NULL,
	"parent_option_id" uuid,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_item_option_value_selection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"option_selection_id" uuid NOT NULL,
	"ref_option_value_id" uuid,
	"value" text NOT NULL,
	"status" varchar(32) DEFAULT 'SELECTED' NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_item_translation" (
	"project_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "bundle_item_translation_item_id_locale_pk" PRIMARY KEY("item_id","locale")
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_price_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"configuration_id" uuid NOT NULL,
	"price_type" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_price_rule_amount" (
	"project_id" uuid NOT NULL,
	"price_rule_id" uuid NOT NULL,
	"currency" "catalog"."currency" NOT NULL,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "bundle_price_rule_amount_price_rule_id_currency_pk" PRIMARY KEY("price_rule_id","currency"),
	CONSTRAINT "bundle_price_rule_amount_minor_check" CHECK ("catalog"."bundle_price_rule_amount"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_price_rule_percent" (
	"project_id" uuid NOT NULL,
	"price_rule_id" uuid PRIMARY KEY NOT NULL,
	"percent_value" integer NOT NULL,
	CONSTRAINT "bundle_price_rule_percent_value_check" CHECK ("catalog"."bundle_price_rule_percent"."percent_value" >= 0 AND "catalog"."bundle_price_rule_percent"."percent_value" <= 100)
);
--> statement-breakpoint
CREATE TABLE "catalog"."bundle_pricing_template" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"configuration_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"price_rule_id" uuid NOT NULL,
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
	"price_rule_id" uuid,
	"stackable" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dependency_action_price_rule_check" CHECK ((
        ("catalog"."dependency_action"."action_type" = 'ADJUST_PRICE' AND "catalog"."dependency_action"."price_rule_id" IS NOT NULL)
        OR
        ("catalog"."dependency_action"."action_type" <> 'ADJUST_PRICE' AND "catalog"."dependency_action"."price_rule_id" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "catalog"."dependency_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"configuration_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"logic_operator" varchar(8) DEFAULT 'AND' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."inventory_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"sku" varchar(255),
	"track_inventory" boolean DEFAULT true NOT NULL,
	"continue_selling_when_out_of_stock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_item_variant_id_unique" UNIQUE("variant_id"),
	CONSTRAINT "inventory_item_sku_unique" UNIQUE("project_id","sku")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_variant_cost_history" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"currency" "catalog"."currency" NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_cost_history_unit_cost_minor_check" CHECK ("catalog"."product_variant_cost_history"."unit_cost_minor" >= 0),
	CONSTRAINT "product_variant_cost_history_effective_interval_check" CHECK ("catalog"."product_variant_cost_history"."effective_to" IS NULL OR "catalog"."product_variant_cost_history"."effective_to" > "catalog"."product_variant_cost_history"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "catalog"."item_dimensions" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"w_mm" integer NOT NULL,
	"l_mm" integer NOT NULL,
	"h_mm" integer NOT NULL,
	"display_unit" "catalog"."dimension_unit" NOT NULL,
	CONSTRAINT "item_dimensions_positive_check" CHECK ("catalog"."item_dimensions"."w_mm" > 0 AND "catalog"."item_dimensions"."l_mm" > 0 AND "catalog"."item_dimensions"."h_mm" > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."item_weight" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"weight_gr" integer NOT NULL,
	"display_unit" "catalog"."weight_unit" DEFAULT 'g' NOT NULL,
	CONSTRAINT "item_weight_positive_check" CHECK ("catalog"."item_weight"."weight_gr" > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."warehouse_stock" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"reserved_qty" integer DEFAULT 0 NOT NULL,
	"unavailable_qty" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_stock_project_id_warehouse_id_variant_id_key" UNIQUE("project_id","warehouse_id","variant_id"),
	CONSTRAINT "warehouse_stock_quantity_check" CHECK ("catalog"."warehouse_stock"."quantity_on_hand" >= 0),
	CONSTRAINT "warehouse_stock_reserved_check" CHECK ("catalog"."warehouse_stock"."reserved_qty" >= 0),
	CONSTRAINT "warehouse_stock_unavailable_check" CHECK ("catalog"."warehouse_stock"."unavailable_qty" >= 0),
	CONSTRAINT "warehouse_stock_unavailable_le_onhand_check" CHECK ("catalog"."warehouse_stock"."unavailable_qty" <= "catalog"."warehouse_stock"."quantity_on_hand")
);
--> statement-breakpoint
CREATE TABLE "catalog"."warehouses" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_project_id_code_key" UNIQUE("project_id","code"),
	CONSTRAINT "warehouses_project_id_id_unique" UNIQUE("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."stock_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "catalog"."stock_changes_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"delta_on_hand" integer DEFAULT 0 NOT NULL,
	"delta_reserved" integer DEFAULT 0 NOT NULL,
	"delta_unavailable" integer DEFAULT 0 NOT NULL,
	"on_hand_after" integer NOT NULL,
	"reserved_after" integer NOT NULL,
	"unavailable_after" integer NOT NULL,
	"movement_type" "catalog"."stock_movement_type" NOT NULL,
	"transfer_direction" "catalog"."stock_transfer_direction",
	"reason" "catalog"."stock_movement_reason",
	"source_system" varchar(30) NOT NULL,
	"source_event_id" varchar(128) NOT NULL,
	"correlation_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"apply_status" "catalog"."stock_apply_status" DEFAULT 'APPLIED' NOT NULL,
	CONSTRAINT "stock_changes_delta_check" CHECK ("catalog"."stock_changes"."movement_type" = 'SEED' OR "catalog"."stock_changes"."delta_on_hand" <> 0 OR "catalog"."stock_changes"."delta_reserved" <> 0 OR "catalog"."stock_changes"."delta_unavailable" <> 0),
	CONSTRAINT "stock_changes_on_hand_after_check" CHECK ("catalog"."stock_changes"."on_hand_after" >= 0),
	CONSTRAINT "stock_changes_reserved_after_check" CHECK ("catalog"."stock_changes"."reserved_after" >= 0),
	CONSTRAINT "stock_changes_unavailable_after_check" CHECK ("catalog"."stock_changes"."unavailable_after" >= 0),
	CONSTRAINT "stock_changes_unavailable_le_onhand_check" CHECK ("catalog"."stock_changes"."unavailable_after" <= "catalog"."stock_changes"."on_hand_after"),
	CONSTRAINT "stock_changes_transfer_dir_check" CHECK (CASE WHEN "catalog"."stock_changes"."movement_type" = 'TRANSFER' THEN "catalog"."stock_changes"."transfer_direction" IS NOT NULL ELSE "catalog"."stock_changes"."transfer_direction" IS NULL END),
	CONSTRAINT "stock_changes_transfer_correlation_check" CHECK ("catalog"."stock_changes"."movement_type" <> 'TRANSFER' OR "catalog"."stock_changes"."correlation_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "catalog"."reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"order_system" varchar(50) NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"status" "catalog"."reservation_status" DEFAULT 'ACTIVE' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now(),
	"released_at" timestamp with time zone,
	CONSTRAINT "reservations_project_order_variant_warehouse_key" UNIQUE("project_id","order_system","order_id","variant_id","warehouse_id"),
	CONSTRAINT "reservations_quantity_check" CHECK ("catalog"."reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_inventory_settings" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"alert_threshold_method" varchar(20) DEFAULT 'SAFETY_STOCK' NOT NULL,
	"alert_minimum_stock" integer DEFAULT 10 NOT NULL,
	"backorder_enabled" boolean DEFAULT false NOT NULL,
	"backorder_max_days" integer,
	"backorder_max_qty" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "product_inventory_settings_project_id_product_id_pk" PRIMARY KEY("project_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."inbound_supply" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" uuid NOT NULL,
	"expected_at" timestamp with time zone NOT NULL,
	"qty_expected" integer NOT NULL,
	"qty_received" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "inbound_supply_project_source_variant_warehouse_key" UNIQUE("project_id","source_type","source_id","variant_id","warehouse_id"),
	CONSTRAINT "inbound_supply_qty_expected_check" CHECK ("catalog"."inbound_supply"."qty_expected" > 0),
	CONSTRAINT "inbound_supply_qty_received_check" CHECK ("catalog"."inbound_supply"."qty_received" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog"."warehouse_translation" (
	"project_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "warehouse_translation_warehouse_id_locale_pk" PRIMARY KEY("warehouse_id","locale")
);
--> statement-breakpoint
ALTER TABLE "catalog"."product" ADD CONSTRAINT "product_vendor_fk" FOREIGN KEY ("project_id","vendor_id") REFERENCES "catalog"."vendor"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "catalog"."product_media" ADD CONSTRAINT "product_media_product_fk" FOREIGN KEY ("project_id","product_id") REFERENCES "catalog"."product"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_media" ADD CONSTRAINT "variant_media_product_media_fk" FOREIGN KEY ("project_id","product_id","product_media_id") REFERENCES "catalog"."product_media"("project_id","product_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_media" ADD CONSTRAINT "variant_media_variant_fk" FOREIGN KEY ("project_id","product_id","variant_id") REFERENCES "catalog"."variant"("project_id","product_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_translation" ADD CONSTRAINT "product_feature_translation_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "catalog"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_value_translation" ADD CONSTRAINT "product_feature_value_translation_feature_value_id_product_feature_value_id_fk" FOREIGN KEY ("feature_value_id") REFERENCES "catalog"."product_feature_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_translation" ADD CONSTRAINT "product_option_translation_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "catalog"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_option_value_translation" ADD CONSTRAINT "product_option_value_translation_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "catalog"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_translation" ADD CONSTRAINT "product_translation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_translation" ADD CONSTRAINT "variant_translation_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."category_seo" ADD CONSTRAINT "category_seo_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_seo" ADD CONSTRAINT "product_seo_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_search_index" ADD CONSTRAINT "product_search_index_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_search_index" ADD CONSTRAINT "variant_search_index_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."variant_search_index" ADD CONSTRAINT "variant_search_index_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet" ADD CONSTRAINT "facet_group_id_facet_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."facet_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_group_translation" ADD CONSTRAINT "facet_group_translation_group_id_facet_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."facet_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_translation" ADD CONSTRAINT "facet_translation_facet_id_facet_id_fk" FOREIGN KEY ("facet_id") REFERENCES "catalog"."facet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_value" ADD CONSTRAINT "facet_value_facet_id_facet_id_fk" FOREIGN KEY ("facet_id") REFERENCES "catalog"."facet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_value" ADD CONSTRAINT "facet_value_swatch_id_facet_swatch_id_fk" FOREIGN KEY ("swatch_id") REFERENCES "catalog"."facet_swatch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_value_source_handle" ADD CONSTRAINT "facet_value_source_handle_facet_id_facet_id_fk" FOREIGN KEY ("facet_id") REFERENCES "catalog"."facet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_value_source_handle" ADD CONSTRAINT "facet_value_source_handle_facet_value_id_facet_value_id_fk" FOREIGN KEY ("facet_value_id") REFERENCES "catalog"."facet_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_value_translation" ADD CONSTRAINT "facet_value_translation_facet_value_id_facet_value_id_fk" FOREIGN KEY ("facet_value_id") REFERENCES "catalog"."facet_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."collection_item" ADD CONSTRAINT "collection_item_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "catalog"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."collection_item" ADD CONSTRAINT "collection_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."collection_media" ADD CONSTRAINT "collection_media_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "catalog"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."collection_rule" ADD CONSTRAINT "collection_rule_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "catalog"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."collection_seo" ADD CONSTRAINT "collection_seo_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "catalog"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."collection_translation" ADD CONSTRAINT "collection_translation_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "catalog"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bulk_edit_item" ADD CONSTRAINT "bulk_edit_item_job_id_bulk_edit_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "catalog"."bulk_edit_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_bulk_fence" ADD CONSTRAINT "product_bulk_fence_job_id_bulk_edit_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "catalog"."bulk_edit_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle" ADD CONSTRAINT "bundle_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_configuration" ADD CONSTRAINT "bundle_configuration_bundle_id_bundle_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "catalog"."bundle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_configuration_variant" ADD CONSTRAINT "bundle_configuration_variant_configuration_id_bundle_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "catalog"."bundle_configuration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_configuration_variant" ADD CONSTRAINT "bundle_configuration_variant_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "catalog"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_group" ADD CONSTRAINT "bundle_group_configuration_id_bundle_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "catalog"."bundle_configuration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_group_translation" ADD CONSTRAINT "bundle_group_translation_group_id_bundle_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."bundle_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item" ADD CONSTRAINT "bundle_item_group_id_bundle_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."bundle_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item" ADD CONSTRAINT "bundle_item_price_rule_id_bundle_price_rule_id_fk" FOREIGN KEY ("price_rule_id") REFERENCES "catalog"."bundle_price_rule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item" ADD CONSTRAINT "bundle_item_pricing_template_id_bundle_pricing_template_id_fk" FOREIGN KEY ("pricing_template_id") REFERENCES "catalog"."bundle_pricing_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item_option_selection" ADD CONSTRAINT "bundle_item_option_selection_item_id_bundle_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "catalog"."bundle_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item_option_selection" ADD CONSTRAINT "bundle_item_option_selection_ref_option_id_product_option_id_fk" FOREIGN KEY ("ref_option_id") REFERENCES "catalog"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item_option_selection" ADD CONSTRAINT "bundle_item_option_selection_parent_option_id_product_option_id_fk" FOREIGN KEY ("parent_option_id") REFERENCES "catalog"."product_option"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item_option_value_selection" ADD CONSTRAINT "bundle_item_option_value_selection_option_selection_id_bundle_item_option_selection_id_fk" FOREIGN KEY ("option_selection_id") REFERENCES "catalog"."bundle_item_option_selection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item_option_value_selection" ADD CONSTRAINT "bundle_item_option_value_selection_ref_option_value_id_product_option_value_id_fk" FOREIGN KEY ("ref_option_value_id") REFERENCES "catalog"."product_option_value"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_item_translation" ADD CONSTRAINT "bundle_item_translation_item_id_bundle_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "catalog"."bundle_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_price_rule" ADD CONSTRAINT "bundle_price_rule_configuration_id_bundle_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "catalog"."bundle_configuration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_price_rule_amount" ADD CONSTRAINT "bundle_price_rule_amount_price_rule_id_bundle_price_rule_id_fk" FOREIGN KEY ("price_rule_id") REFERENCES "catalog"."bundle_price_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_price_rule_percent" ADD CONSTRAINT "bundle_price_rule_percent_price_rule_id_bundle_price_rule_id_fk" FOREIGN KEY ("price_rule_id") REFERENCES "catalog"."bundle_price_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_pricing_template" ADD CONSTRAINT "bundle_pricing_template_configuration_id_bundle_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "catalog"."bundle_configuration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."bundle_pricing_template" ADD CONSTRAINT "bundle_pricing_template_price_rule_id_bundle_price_rule_id_fk" FOREIGN KEY ("price_rule_id") REFERENCES "catalog"."bundle_price_rule"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."condition" ADD CONSTRAINT "condition_group_id_condition_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "catalog"."condition_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."condition_group" ADD CONSTRAINT "condition_group_rule_id_dependency_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "catalog"."dependency_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."dependency_action" ADD CONSTRAINT "dependency_action_rule_id_dependency_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "catalog"."dependency_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."dependency_action" ADD CONSTRAINT "dependency_action_price_rule_id_bundle_price_rule_id_fk" FOREIGN KEY ("price_rule_id") REFERENCES "catalog"."bundle_price_rule"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."dependency_rule" ADD CONSTRAINT "dependency_rule_configuration_id_bundle_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "catalog"."bundle_configuration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_fk" FOREIGN KEY ("project_id","warehouse_id") REFERENCES "catalog"."warehouses"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."stock_changes" ADD CONSTRAINT "stock_changes_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "catalog"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."reservations" ADD CONSTRAINT "reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "catalog"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."inbound_supply" ADD CONSTRAINT "inbound_supply_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "catalog"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."warehouse_translation" ADD CONSTRAINT "warehouse_translation_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "catalog"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_project_id_handle_key" ON "catalog"."product" USING btree ("project_id","handle") WHERE deleted_at IS NULL AND handle IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_product_project_id" ON "catalog"."product" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_vendor_id" ON "catalog"."product" USING btree ("vendor_id");--> statement-breakpoint
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
CREATE UNIQUE INDEX "vendor_project_id_name_key" ON "catalog"."vendor" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "idx_vendor_project_id" ON "catalog"."vendor" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_project_id_handle_key" ON "catalog"."category" USING btree ("project_id","handle") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_category_project_id" ON "catalog"."category" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_parent_id" ON "catalog"."category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_category_path" ON "catalog"."category" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_category_published" ON "catalog"."category" USING btree ("project_id","published_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_category_media_category" ON "catalog"."category_media" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_translation_project" ON "catalog"."category_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_translation_project_locale" ON "catalog"."category_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "product_category_one_primary_per_product_idx" ON "catalog"."product_category" USING btree ("project_id","product_id") WHERE is_primary = true;--> statement-breakpoint
CREATE INDEX "idx_product_category_product" ON "catalog"."product_category" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_category_category" ON "catalog"."product_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_category_rank" ON "catalog"."product_category" USING btree ("category_id","lexo_rank");--> statement-breakpoint
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
CREATE INDEX "idx_product_option_sort" ON "catalog"."product_option" USING btree ("project_id","product_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_product_option_swatch_project_id" ON "catalog"."product_option_swatch" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_option_id" ON "catalog"."product_option_value" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_variant_link_project_id" ON "catalog"."product_option_variant_link" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "product_feature_sort_idx" ON "catalog"."product_feature" USING btree ("product_id","index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_product_id" ON "catalog"."product_feature" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_feature_children_idx" ON "catalog"."product_feature" USING btree ("product_id","parent_id","index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_feature_id" ON "catalog"."product_feature_value" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_project" ON "catalog"."product_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_product" ON "catalog"."product_media" USING btree ("project_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_file" ON "catalog"."product_media" USING btree ("project_id","file_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_sort" ON "catalog"."product_media" USING btree ("project_id","product_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_variant_media_project" ON "catalog"."variant_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_product" ON "catalog"."variant_media" USING btree ("project_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_variant" ON "catalog"."variant_media" USING btree ("project_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_product_media" ON "catalog"."variant_media" USING btree ("project_id","product_media_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_sort" ON "catalog"."variant_media" USING btree ("project_id","variant_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_translation_project" ON "catalog"."product_feature_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_translation_project" ON "catalog"."product_feature_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_translation_project" ON "catalog"."product_option_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_translation_project" ON "catalog"."product_option_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project" ON "catalog"."product_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project_locale" ON "catalog"."product_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_variant_translation_project" ON "catalog"."variant_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_seo_project" ON "catalog"."category_seo" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_seo_project_locale" ON "catalog"."category_seo" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_product_seo_project" ON "catalog"."product_seo" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_seo_project_locale" ON "catalog"."product_seo" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_product_search_index_project_status" ON "catalog"."product_search_index" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_product_search_index_created_at" ON "catalog"."product_search_index" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_product_search_index_tag_handles_gin" ON "catalog"."product_search_index" USING gin ("tag_handles");--> statement-breakpoint
CREATE INDEX "idx_product_search_index_feature_slugs_gin" ON "catalog"."product_search_index" USING gin ("feature_slugs");--> statement-breakpoint
CREATE INDEX "idx_product_search_index_category_handles_gin" ON "catalog"."product_search_index" USING gin ("category_handles");--> statement-breakpoint
CREATE INDEX "idx_variant_search_index_project_product" ON "catalog"."variant_search_index" USING btree ("project_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_search_index_project_in_stock" ON "catalog"."variant_search_index" USING btree ("project_id","in_stock");--> statement-breakpoint
CREATE INDEX "idx_variant_search_index_project_price" ON "catalog"."variant_search_index" USING btree ("project_id","price_currency","price_minor");--> statement-breakpoint
CREATE INDEX "idx_variant_search_index_option_slugs_gin" ON "catalog"."variant_search_index" USING gin ("option_slugs");--> statement-breakpoint
CREATE INDEX "idx_facet_group_translation_project_locale" ON "catalog"."facet_group_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_facet_translation_project_locale" ON "catalog"."facet_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_facet_value_source_handle_project_value" ON "catalog"."facet_value_source_handle" USING btree ("project_id","facet_value_id");--> statement-breakpoint
CREATE INDEX "idx_facet_value_source_handle_project_type_source" ON "catalog"."facet_value_source_handle" USING btree ("project_id","facet_type","source_handle");--> statement-breakpoint
CREATE INDEX "idx_facet_value_translation_project_locale" ON "catalog"."facet_value_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_project_id_handle_uniq" ON "catalog"."collection" USING btree ("project_id","handle") WHERE deleted_at IS NULL AND handle IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_collection_scheduling" ON "catalog"."collection" USING btree ("project_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_collection_item_rank" ON "catalog"."collection_item" USING btree ("collection_id","lexo_rank");--> statement-breakpoint
CREATE INDEX "idx_collection_rule_collection" ON "catalog"."collection_rule" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_collection_seo_project_locale" ON "catalog"."collection_seo" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_collection_translation_project_locale" ON "catalog"."collection_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "bulk_edit_job_project_created_idx" ON "catalog"."bulk_edit_job" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "bulk_edit_job_project_status_idx" ON "catalog"."bulk_edit_job" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "bulk_edit_item_project_product_status_idx" ON "catalog"."bulk_edit_item" USING btree ("project_id","product_id","status");--> statement-breakpoint
CREATE INDEX "bulk_edit_item_job_chunk_op_idx" ON "catalog"."bulk_edit_item" USING btree ("job_id","chunk_index","op_index");--> statement-breakpoint
CREATE INDEX "bulk_edit_item_job_status_idx" ON "catalog"."bulk_edit_item" USING btree ("job_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "bundle_product_id_unique" ON "catalog"."bundle" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_project_id" ON "catalog"."bundle" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_configuration_bundle_id" ON "catalog"."bundle_configuration" USING btree ("bundle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bundle_configuration_variant_unique" ON "catalog"."bundle_configuration_variant" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_configuration_variant_project_id" ON "catalog"."bundle_configuration_variant" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_group_configuration_id" ON "catalog"."bundle_group" USING btree ("configuration_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_group_sort" ON "catalog"."bundle_group" USING btree ("configuration_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_bundle_group_translation_project_locale" ON "catalog"."bundle_group_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_group_id" ON "catalog"."bundle_item" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_ref_product_id" ON "catalog"."bundle_item" USING btree ("ref_product_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_ref_variant_id" ON "catalog"."bundle_item" USING btree ("ref_variant_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_sort" ON "catalog"."bundle_item" USING btree ("group_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_price_rule_id" ON "catalog"."bundle_item" USING btree ("price_rule_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_option_selection_item_id" ON "catalog"."bundle_item_option_selection" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_option_selection_ref_option_id" ON "catalog"."bundle_item_option_selection" USING btree ("ref_option_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_option_selection_parent_option_id" ON "catalog"."bundle_item_option_selection" USING btree ("parent_option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bundle_item_option_selection_item_option_unique" ON "catalog"."bundle_item_option_selection" USING btree ("item_id","ref_option_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_option_value_selection_option_id" ON "catalog"."bundle_item_option_value_selection" USING btree ("option_selection_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_option_value_selection_ref_value_id" ON "catalog"."bundle_item_option_value_selection" USING btree ("ref_option_value_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_option_value_selection_status" ON "catalog"."bundle_item_option_value_selection" USING btree ("option_selection_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "bundle_item_option_value_selection_value_unique" ON "catalog"."bundle_item_option_value_selection" USING btree ("option_selection_id","value");--> statement-breakpoint
CREATE INDEX "idx_bundle_item_translation_project_locale" ON "catalog"."bundle_item_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_bundle_price_rule_configuration_id" ON "catalog"."bundle_price_rule" USING btree ("configuration_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_price_rule_amount_project_currency" ON "catalog"."bundle_price_rule_amount" USING btree ("project_id","currency");--> statement-breakpoint
CREATE INDEX "idx_bundle_price_rule_percent_project_id" ON "catalog"."bundle_price_rule_percent" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_pricing_template_configuration_id" ON "catalog"."bundle_pricing_template" USING btree ("configuration_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_pricing_template_price_rule_id" ON "catalog"."bundle_pricing_template" USING btree ("price_rule_id");--> statement-breakpoint
CREATE INDEX "idx_condition_group_id" ON "catalog"."condition" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_condition_target" ON "catalog"."condition" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_condition_group_rule_id" ON "catalog"."condition_group" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_action_rule_id" ON "catalog"."dependency_action" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_action_target" ON "catalog"."dependency_action" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_action_price_rule_id" ON "catalog"."dependency_action" USING btree ("price_rule_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_rule_configuration_id" ON "catalog"."dependency_rule" USING btree ("configuration_id");--> statement-breakpoint
CREATE INDEX "idx_dependency_rule_priority" ON "catalog"."dependency_rule" USING btree ("configuration_id","priority");--> statement-breakpoint
CREATE INDEX "idx_inventory_item_variant" ON "catalog"."inventory_item" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_item_project" ON "catalog"."inventory_item" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_variant_currency_effective_from" ON "catalog"."product_variant_cost_history" USING btree ("project_id","variant_id","currency","effective_from");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_variant_effective_from" ON "catalog"."product_variant_cost_history" USING btree ("project_id","variant_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_recorded_at" ON "catalog"."product_variant_cost_history" USING btree ("project_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_effective_to" ON "catalog"."product_variant_cost_history" USING btree ("project_id","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_variant_cost_history_current_unique" ON "catalog"."product_variant_cost_history" USING btree ("project_id","variant_id","currency") WHERE effective_to IS NULL;--> statement-breakpoint
CREATE INDEX "idx_item_dimensions_project_id" ON "catalog"."item_dimensions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_item_weight_project_id" ON "catalog"."item_weight" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_warehouse_stock_variant" ON "catalog"."warehouse_stock" USING btree ("project_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warehouses_default_unique" ON "catalog"."warehouses" USING btree ("project_id") WHERE is_default = true;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_changes_seq_unique" ON "catalog"."stock_changes" USING btree ("seq");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_changes_idempotency" ON "catalog"."stock_changes" USING btree ("project_id","source_system","source_event_id","warehouse_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_idempo_lookup" ON "catalog"."stock_changes" USING btree ("project_id","source_system","source_event_id");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_variant_created_seq" ON "catalog"."stock_changes" USING btree ("variant_id","created_at","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_variant_warehouse_created_seq" ON "catalog"."stock_changes" USING btree ("variant_id","warehouse_id","created_at","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_project_seq" ON "catalog"."stock_changes" USING btree ("project_id","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_type_seq" ON "catalog"."stock_changes" USING btree ("movement_type","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_reason_seq" ON "catalog"."stock_changes" USING btree ("reason","seq");--> statement-breakpoint
CREATE INDEX "idx_reservations_variant" ON "catalog"."reservations" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_order" ON "catalog"."reservations" USING btree ("order_system","order_id");--> statement-breakpoint
CREATE INDEX "idx_inbound_supply_variant_date" ON "catalog"."inbound_supply" USING btree ("variant_id","warehouse_id","expected_at");--> statement-breakpoint
CREATE INDEX "idx_warehouse_translation_project" ON "catalog"."warehouse_translation" USING btree ("project_id");--> statement-breakpoint
CREATE VIEW "catalog"."product_price_range" AS (select "catalog"."item_pricing"."project_id", "catalog"."variant"."product_id", "catalog"."item_pricing"."currency", MIN("catalog"."item_pricing"."amount_minor") as "min_amount_minor", MAX("catalog"."item_pricing"."amount_minor") as "max_amount_minor" from "catalog"."item_pricing" inner join "catalog"."variant" on "catalog"."variant"."id" = "catalog"."item_pricing"."variant_id" AND "catalog"."variant"."deleted_at" IS NULL where "catalog"."item_pricing"."effective_to" IS NULL group by "catalog"."item_pricing"."project_id", "catalog"."variant"."product_id", "catalog"."item_pricing"."currency");--> statement-breakpoint
CREATE VIEW "catalog"."variant_prices_current" AS (select "id", "project_id", "variant_id", "currency", "amount_minor", "compare_at_minor", "effective_from", "effective_to", "recorded_at" from "catalog"."item_pricing" where "catalog"."item_pricing"."effective_to" IS NULL);--> statement-breakpoint
CREATE VIEW "catalog"."product_list_view" AS (select "catalog"."product"."project_id", "catalog"."product"."id", "catalog"."product"."vendor_id", "catalog"."product"."handle", "catalog"."product"."published_at", "catalog"."product"."created_at", "catalog"."product"."updated_at", "catalog"."product"."deleted_at", "catalog"."product"."revision", "catalog"."product"."kind", "catalog"."product_translation"."locale", "catalog"."product_translation"."name", "product_price_range"."currency", "min_amount_minor" as "min_price_minor", "max_amount_minor" as "max_price_minor", "catalog"."product_category"."category_id" as "primary_category_id", "catalog"."category_translation"."name" as "primary_category_name", "catalog"."vendor"."name" as "brand_name" from "catalog"."product" inner join "catalog"."product_translation" on "catalog"."product_translation"."project_id" = "catalog"."product"."project_id" AND "catalog"."product_translation"."product_id" = "catalog"."product"."id" left join "catalog"."product_price_range" on "product_price_range"."project_id" = "catalog"."product"."project_id" AND "product_price_range"."product_id" = "catalog"."product"."id" left join "catalog"."product_category" on "catalog"."product_category"."project_id" = "catalog"."product"."project_id" AND "catalog"."product_category"."product_id" = "catalog"."product"."id" AND "catalog"."product_category"."is_primary" = true left join "catalog"."category_translation" on "catalog"."category_translation"."project_id" = "catalog"."product"."project_id" AND "catalog"."category_translation"."category_id" = "catalog"."product_category"."category_id" AND "catalog"."category_translation"."locale" = "catalog"."product_translation"."locale" left join "catalog"."vendor" on "catalog"."vendor"."project_id" = "catalog"."product"."project_id" AND "catalog"."vendor"."id" = "catalog"."product"."vendor_id");--> statement-breakpoint
CREATE VIEW "catalog"."category_list_view" AS (select "catalog"."category"."project_id", "catalog"."category"."id", "catalog"."category"."parent_id", "catalog"."category"."path", "catalog"."category"."depth", "catalog"."category"."handle", "catalog"."category"."default_sort", "catalog"."category"."default_sort_direction", "catalog"."category"."published_at", "catalog"."category"."created_at", "catalog"."category"."updated_at", "catalog"."category"."deleted_at", "catalog"."category"."revision", "catalog"."category"."products_count", "catalog"."category_translation"."locale", "catalog"."category_translation"."name" from "catalog"."category" inner join "catalog"."category_translation" on "catalog"."category_translation"."project_id" = "catalog"."category"."project_id" AND "catalog"."category_translation"."category_id" = "catalog"."category"."id");--> statement-breakpoint
CREATE VIEW "catalog"."tag_list_view" AS (select "catalog"."tag"."project_id", "catalog"."tag"."id", "catalog"."tag"."handle", "catalog"."tag"."created_at", "catalog"."tag"."products_count", "catalog"."tag_translation"."locale", "catalog"."tag_translation"."name" from "catalog"."tag" inner join "catalog"."tag_translation" on "catalog"."tag_translation"."project_id" = "catalog"."tag"."project_id" AND "catalog"."tag_translation"."tag_id" = "catalog"."tag"."id");--> statement-breakpoint
CREATE VIEW "catalog"."variant_warehouse_candidate_view" AS (
    SELECT
      variant.project_id,
      warehouse.id AS warehouse_scope_id,
      variant.product_id,
      variant.kind,
      translation.locale,
      translation.name AS product_name,
      variant.id,
      variant.is_default,
      variant.handle,
      variant.sku,
      variant.external_system,
      variant.external_id,
      variant.updated_at,
      variant.created_at,
      variant.deleted_at,
      product.deleted_at AS product_deleted_at,
      item.id AS inventory_item_id
    FROM catalog.variant variant
    JOIN catalog.product product
      ON product.project_id = variant.project_id
     AND product.id = variant.product_id
    JOIN catalog.warehouses warehouse
      ON warehouse.project_id = variant.project_id
    JOIN catalog.product_translation translation
      ON translation.project_id = variant.project_id
     AND translation.product_id = product.id
    LEFT JOIN catalog.inventory_item item
      ON item.project_id = variant.project_id
     AND item.variant_id = variant.id
    LEFT JOIN catalog.warehouse_stock stock
      ON stock.project_id = variant.project_id
     AND stock.variant_id = variant.id
     AND stock.warehouse_id = warehouse.id
    WHERE stock.id IS NULL
  );--> statement-breakpoint
CREATE VIEW "catalog"."inventory_item_list_all_stock_view" AS (
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      product.id AS product_id,
      variant.kind,
      product.handle AS product_handle,
      translation.locale,
      translation.name AS product_name,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      coalesce(variant.deleted_at, product.deleted_at) AS deleted_at,
      greatest(
        item.updated_at,
        product.updated_at,
        variant.updated_at
      ) AS updated_at,
      coalesce(stock.quantity_on_hand, 0)::integer AS quantity_on_hand,
      coalesce(stock.reserved_quantity, 0)::integer AS reserved_quantity,
      coalesce(stock.unavailable_quantity, 0)::integer AS unavailable_quantity,
      (
        coalesce(stock.quantity_on_hand, 0)
        - coalesce(stock.reserved_quantity, 0)
        - coalesce(stock.unavailable_quantity, 0)
      )::integer AS available_for_sale
    FROM catalog.inventory_item item
    JOIN catalog.variant variant
      ON variant.project_id = item.project_id
     AND variant.id = item.variant_id
    JOIN catalog.product product
      ON product.project_id = item.project_id
     AND product.id = variant.product_id
    JOIN catalog.product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = product.id
    LEFT JOIN (
      SELECT
        project_id,
        variant_id,
        sum(quantity_on_hand)::integer AS quantity_on_hand,
        sum(reserved_qty)::integer AS reserved_quantity,
        sum(unavailable_qty)::integer AS unavailable_quantity
      FROM catalog.warehouse_stock
      GROUP BY project_id, variant_id
    ) stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
  );--> statement-breakpoint
CREATE VIEW "catalog"."inventory_item_list_warehouse_stock_view" AS (
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      product.id AS product_id,
      variant.kind,
      product.handle AS product_handle,
      translation.locale,
      translation.name AS product_name,
      stock.warehouse_id AS warehouse_scope_id,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      coalesce(variant.deleted_at, product.deleted_at) AS deleted_at,
      greatest(
        item.updated_at,
        product.updated_at,
        variant.updated_at
      ) AS updated_at,
      stock.quantity_on_hand::integer AS quantity_on_hand,
      stock.reserved_qty::integer AS reserved_quantity,
      stock.unavailable_qty::integer AS unavailable_quantity,
      (
        stock.quantity_on_hand
        - stock.reserved_qty
        - stock.unavailable_qty
      )::integer AS available_for_sale
    FROM catalog.inventory_item item
    JOIN catalog.variant variant
      ON variant.project_id = item.project_id
     AND variant.id = item.variant_id
    JOIN catalog.product product
      ON product.project_id = item.project_id
     AND product.id = variant.product_id
    JOIN catalog.product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = product.id
    JOIN catalog.warehouse_stock stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
  );--> statement-breakpoint
CREATE VIEW "catalog"."variant_costs_current" AS (select "id", "project_id", "variant_id", "currency", "unit_cost_minor", "effective_from", "effective_to", "recorded_at" from "catalog"."product_variant_cost_history" where "catalog"."product_variant_cost_history"."effective_to" IS NULL);
