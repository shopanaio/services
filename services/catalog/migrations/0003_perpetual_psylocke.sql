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
	CONSTRAINT "collection_translation_collection_id_locale_pk" PRIMARY KEY("collection_id","locale")
);
--> statement-breakpoint
ALTER TABLE "catalog"."product_category" RENAME COLUMN "sort_index" TO "lexo_rank";--> statement-breakpoint
ALTER TABLE "catalog"."product_category" ALTER COLUMN "lexo_rank" TYPE varchar(64) USING lpad("lexo_rank"::text, 20, '0');--> statement-breakpoint
ALTER TABLE "catalog"."category" ADD COLUMN "default_sort" varchar(32) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."category" ADD COLUMN "default_sort_direction" varchar(4) DEFAULT 'asc' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."category_seo" ADD CONSTRAINT "category_seo_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "idx_category_seo_project" ON "catalog"."category_seo" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_category_seo_project_locale" ON "catalog"."category_seo" USING btree ("project_id","locale");--> statement-breakpoint
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
CREATE INDEX "idx_product_category_rank" ON "catalog"."product_category" USING btree ("category_id","lexo_rank");--> statement-breakpoint
ALTER TABLE "catalog"."category" ADD CONSTRAINT "category_default_sort_check" CHECK (default_sort IN ('manual', 'price', 'newest', 'name'));--> statement-breakpoint
ALTER TABLE "catalog"."category" ADD CONSTRAINT "category_default_sort_direction_check" CHECK (default_sort_direction IN ('asc', 'desc'));
