CREATE TABLE "media"."media_sources" (
	"media_file_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"format" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_sources_media_file_id_source_file_id_pk" PRIMARY KEY("media_file_id","source_file_id")
);
--> statement-breakpoint
CREATE TABLE "media"."cdn_configurations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_group_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"base_url" text NOT NULL,
	"path_prefix" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"signing_mode" varchar(32) DEFAULT 'NONE' NOT NULL,
	"secret_ref" text,
	"transform_strategy" varchar(64) DEFAULT 'NONE' NOT NULL,
	"url_template" text,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transform_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media"."cdn_routing_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_group_id" uuid NOT NULL,
	"cdn_configuration_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transform_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "media_type" varchar(32) DEFAULT 'GENERIC_FILE' NOT NULL;--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "preview_file_id" uuid;--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "thumbhash" text;--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "processing_status" varchar(32) DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "processing_error" text;--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media"."media_sources" ADD CONSTRAINT "media_sources_media_file_id_files_id_fk" FOREIGN KEY ("media_file_id") REFERENCES "media"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media"."media_sources" ADD CONSTRAINT "media_sources_source_file_id_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "media"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media"."cdn_configurations" ADD CONSTRAINT "cdn_configurations_asset_group_id_asset_groups_id_fk" FOREIGN KEY ("asset_group_id") REFERENCES "media"."asset_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media"."cdn_routing_rules" ADD CONSTRAINT "cdn_routing_rules_asset_group_id_asset_groups_id_fk" FOREIGN KEY ("asset_group_id") REFERENCES "media"."asset_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media"."cdn_routing_rules" ADD CONSTRAINT "cdn_routing_rules_cdn_configuration_id_cdn_configurations_id_fk" FOREIGN KEY ("cdn_configuration_id") REFERENCES "media"."cdn_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_media_sources_order" ON "media"."media_sources" USING btree ("media_file_id","kind","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cdn_configurations_name" ON "media"."cdn_configurations" USING btree ("asset_group_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cdn_configurations_default" ON "media"."cdn_configurations" USING btree ("asset_group_id") WHERE enabled = true AND is_default = true;--> statement-breakpoint
CREATE INDEX "idx_cdn_configurations_provider" ON "media"."cdn_configurations" USING btree ("asset_group_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cdn_routing_rules_name" ON "media"."cdn_routing_rules" USING btree ("asset_group_id","name");--> statement-breakpoint
CREATE INDEX "idx_cdn_routing_rules_priority" ON "media"."cdn_routing_rules" USING btree ("asset_group_id","priority") WHERE enabled = true;--> statement-breakpoint
CREATE INDEX "idx_cdn_routing_rules_configuration" ON "media"."cdn_routing_rules" USING btree ("cdn_configuration_id");--> statement-breakpoint
ALTER TABLE "media"."files" ADD CONSTRAINT "files_preview_file_id_files_id_fk" FOREIGN KEY ("preview_file_id") REFERENCES "media"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_files_media_type" ON "media"."files" USING btree ("asset_group_id","media_type") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_files_preview_file" ON "media"."files" USING btree ("preview_file_id");