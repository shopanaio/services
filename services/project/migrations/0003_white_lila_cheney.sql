CREATE TYPE "store"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "store"."automatic_fulfillment_mode" AS ENUM('all_line_items', 'gift_cards_only', 'disabled');--> statement-breakpoint
CREATE TYPE "store"."currency_display" AS ENUM('symbol', 'narrowSymbol', 'code', 'name');--> statement-breakpoint
CREATE TYPE "store"."currency_grouping" AS ENUM('auto', 'always', 'min2', 'never');--> statement-breakpoint
CREATE TYPE "store"."currency_rounding_mode" AS ENUM('ceil', 'floor', 'expand', 'trunc', 'halfCeil', 'halfFloor', 'halfExpand', 'halfTrunc', 'halfEven');--> statement-breakpoint
CREATE TYPE "store"."currency_sign_display" AS ENUM('auto', 'always', 'exceptZero', 'negative', 'never');--> statement-breakpoint
CREATE TYPE "store"."currency_sign" AS ENUM('standard', 'accounting');--> statement-breakpoint
CREATE TYPE "store"."currency_trailing_zero_display" AS ENUM('auto', 'stripIfInteger');--> statement-breakpoint
CREATE TABLE "store"."store_address" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"company_name" varchar(255),
	"country_code" varchar(2) NOT NULL,
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(128),
	"administrative_area" varchar(128),
	"postal_code" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_address_country_code_format_check" CHECK ("store"."store_address"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "store_address_company_name_not_blank_check" CHECK ("store"."store_address"."company_name" IS NULL OR btrim("store"."store_address"."company_name") <> ''),
	CONSTRAINT "store_address_line_1_not_blank_check" CHECK ("store"."store_address"."address_line_1" IS NULL OR btrim("store"."store_address"."address_line_1") <> ''),
	CONSTRAINT "store_address_line_2_not_blank_check" CHECK ("store"."store_address"."address_line_2" IS NULL OR btrim("store"."store_address"."address_line_2") <> ''),
	CONSTRAINT "store_address_city_not_blank_check" CHECK ("store"."store_address"."city" IS NULL OR btrim("store"."store_address"."city") <> ''),
	CONSTRAINT "store_address_administrative_area_not_blank_check" CHECK ("store"."store_address"."administrative_area" IS NULL OR btrim("store"."store_address"."administrative_area") <> ''),
	CONSTRAINT "store_address_postal_code_not_blank_check" CHECK ("store"."store_address"."postal_code" IS NULL OR btrim("store"."store_address"."postal_code") <> '')
);
--> statement-breakpoint
CREATE TABLE "store"."store_phone" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"phone_number" varchar(16) NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_phone_number_e164_check" CHECK ("store"."store_phone"."phone_number" ~ '^[+][1-9][0-9]{1,14}$'),
	CONSTRAINT "store_phone_position_check" CHECK ("store"."store_phone"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "store"."store_brand" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"default_logo_media_id" uuid,
	"square_logo_media_id" uuid,
	"cover_image_media_id" uuid,
	"primary_color" varchar(7) DEFAULT '#1677FF' NOT NULL,
	"secondary_color" varchar(7) DEFAULT '#101112' NOT NULL,
	"slogan" varchar(255),
	"short_description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_brand_primary_color_check" CHECK ("store"."store_brand"."primary_color" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "store_brand_secondary_color_check" CHECK ("store"."store_brand"."secondary_color" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "store_brand_slogan_not_blank_check" CHECK ("store"."store_brand"."slogan" IS NULL OR btrim("store"."store_brand"."slogan") <> ''),
	CONSTRAINT "store_brand_short_description_not_blank_check" CHECK ("store"."store_brand"."short_description" IS NULL OR btrim("store"."store_brand"."short_description") <> '')
);
--> statement-breakpoint
CREATE TABLE "store"."store_brand_social_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" varchar(32) NOT NULL,
	"url" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_brand_social_link_platform_format_check" CHECK ("store"."store_brand_social_link"."platform" ~ '^[a-z][a-z0-9_-]{0,31}$'),
	CONSTRAINT "store_brand_social_link_url_check" CHECK ("store"."store_brand_social_link"."url" ~* '^https?://[^[:space:]]+$'),
	CONSTRAINT "store_brand_social_link_position_check" CHECK ("store"."store_brand_social_link"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "store"."store_order_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_number_prefix" varchar(16) DEFAULT '#' NOT NULL,
	"order_number_suffix" varchar(16),
	"require_checkout_confirmation" boolean DEFAULT true NOT NULL,
	"automatic_fulfillment_mode" "store"."automatic_fulfillment_mode" DEFAULT 'disabled' NOT NULL,
	"automatically_archive_orders" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_order_settings_prefix_no_control_characters_check" CHECK ("store"."store_order_settings"."order_number_prefix" !~ '[[:cntrl:]]'),
	CONSTRAINT "store_order_settings_suffix_no_control_characters_check" CHECK ("store"."store_order_settings"."order_number_suffix" IS NULL OR "store"."store_order_settings"."order_number_suffix" !~ '[[:cntrl:]]')
);
--> statement-breakpoint
CREATE TABLE "store"."store_currency_formatting" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"currency_display" "store"."currency_display" DEFAULT 'symbol' NOT NULL,
	"currency_sign" "store"."currency_sign" DEFAULT 'standard' NOT NULL,
	"grouping" "store"."currency_grouping" DEFAULT 'auto' NOT NULL,
	"sign_display" "store"."currency_sign_display" DEFAULT 'auto' NOT NULL,
	"minimum_fraction_digits" smallint DEFAULT 2 NOT NULL,
	"maximum_fraction_digits" smallint DEFAULT 2 NOT NULL,
	"rounding_mode" "store"."currency_rounding_mode" DEFAULT 'halfExpand' NOT NULL,
	"trailing_zero_display" "store"."currency_trailing_zero_display" DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_currency_formatting_minimum_fraction_digits_check" CHECK ("store"."store_currency_formatting"."minimum_fraction_digits" BETWEEN 0 AND 100),
	CONSTRAINT "store_currency_formatting_maximum_fraction_digits_check" CHECK ("store"."store_currency_formatting"."maximum_fraction_digits" BETWEEN 0 AND 100),
	CONSTRAINT "store_currency_formatting_fraction_digits_order_check" CHECK ("store"."store_currency_formatting"."minimum_fraction_digits" <= "store"."store_currency_formatting"."maximum_fraction_digits")
);
--> statement-breakpoint
ALTER TABLE "store"."store" DROP CONSTRAINT "store_id_default_locale_locale_store_id_code_fk";
--> statement-breakpoint
DROP INDEX "store"."idx_locale_is_active";--> statement-breakpoint
DROP INDEX "store"."idx_store_external";--> statement-breakpoint
DROP INDEX "store"."store_name_key";--> statement-breakpoint
ALTER TABLE "store"."locale" DROP CONSTRAINT "locale_store_id_code_pk";--> statement-breakpoint
ALTER TABLE "store"."store" ALTER COLUMN "name" SET DATA TYPE varchar(63);--> statement-breakpoint
ALTER TABLE "store"."store_integration" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "store"."locale" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL;--> statement-breakpoint
ALTER TABLE "store"."store" ADD COLUMN "unit_system" "store"."unit_system" DEFAULT 'metric' NOT NULL;--> statement-breakpoint
ALTER TABLE "store"."store_brand_social_link" ADD CONSTRAINT "store_brand_social_link_brand_id_store_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "store"."store_brand"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_address_store_unique" ON "store"."store_address" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_phone_store_number_unique" ON "store"."store_phone" USING btree ("store_id","phone_number");--> statement-breakpoint
CREATE INDEX "store_phone_store_position_idx" ON "store"."store_phone" USING btree ("store_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_brand_store_unique" ON "store"."store_brand" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_brand_social_link_platform_unique" ON "store"."store_brand_social_link" USING btree ("brand_id","platform");--> statement-breakpoint
CREATE INDEX "store_brand_social_link_store_position_idx" ON "store"."store_brand_social_link" USING btree ("store_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_order_settings_store_unique" ON "store"."store_order_settings" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_currency_formatting_store_unique" ON "store"."store_currency_formatting" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locale_store_code_unique" ON "store"."locale" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_locale_store_active" ON "store"."locale" USING btree ("store_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "store_external_identity_key" ON "store"."store" USING btree ("external_system","external_id") WHERE "store"."store"."external_system" IS NOT NULL AND "store"."store"."external_id" IS NOT NULL AND "store"."store"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "store_name_key" ON "store"."store" USING btree ("name") WHERE "store"."store"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "store"."store" ADD CONSTRAINT "store_name_format_check" CHECK ("store"."store"."name" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "store"."store" ADD CONSTRAINT "store_display_name_not_blank_check" CHECK (btrim("store"."store"."display_name") <> '');--> statement-breakpoint
ALTER TABLE "store"."store" ADD CONSTRAINT "store_timezone_not_blank_check" CHECK (btrim("store"."store"."timezone") <> '');--> statement-breakpoint
ALTER TABLE "store"."store" ADD CONSTRAINT "store_email_not_blank_check" CHECK ("store"."store"."email" IS NULL OR btrim("store"."store"."email") <> '');--> statement-breakpoint
ALTER TABLE "store"."store" ADD CONSTRAINT "store_external_identity_pair_check" CHECK (("store"."store"."external_system" IS NULL) = ("store"."store"."external_id" IS NULL));