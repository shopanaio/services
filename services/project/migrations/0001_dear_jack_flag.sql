CREATE TYPE "store"."market_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "store"."sales_channel_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "store"."sales_channel_type" AS ENUM('online_store', 'mobile_app', 'point_of_sale', 'marketplace', 'b2b', 'custom');--> statement-breakpoint
CREATE TABLE "store"."market" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "store"."market_status" DEFAULT 'active' NOT NULL,
	"default_currency_code" "store"."currency_code" NOT NULL,
	"default_locale_code" "store"."locale_code" NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"tax_included" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "market_code_format_check" CHECK ("store"."market"."code" ~ '^[a-z][a-z0-9_-]{0,63}$'),
	CONSTRAINT "market_name_not_blank_check" CHECK (btrim("store"."market"."name") <> ''),
	CONSTRAINT "market_timezone_not_blank_check" CHECK (btrim("store"."market"."timezone") <> '')
);
--> statement-breakpoint
CREATE TABLE "store"."market_country" (
	"store_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_country_pkey" PRIMARY KEY("market_id","country_code"),
	CONSTRAINT "market_country_code_format_check" CHECK ("store"."market_country"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "store"."market_currency" (
	"store_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"currency_code" "store"."currency_code" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_currency_pkey" PRIMARY KEY("market_id","currency_code")
);
--> statement-breakpoint
CREATE TABLE "store"."market_locale" (
	"store_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"locale_code" "store"."locale_code" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_locale_pkey" PRIMARY KEY("market_id","locale_code")
);
--> statement-breakpoint
CREATE TABLE "store"."sales_channel" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "store"."sales_channel_type" NOT NULL,
	"status" "store"."sales_channel_status" DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sales_channel_code_format_check" CHECK ("store"."sales_channel"."code" ~ '^[A-Z][A-Z0-9_:-]{1,63}$'),
	CONSTRAINT "sales_channel_name_not_blank_check" CHECK (btrim("store"."sales_channel"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "store"."market_sales_channel" (
	"store_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"sales_channel_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_sales_channel_pkey" PRIMARY KEY("market_id","sales_channel_id")
);
--> statement-breakpoint
ALTER TABLE "store"."store" ADD COLUMN "application_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "store"."market_country" ADD CONSTRAINT "market_country_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "store"."market"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store"."market_currency" ADD CONSTRAINT "market_currency_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "store"."market"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store"."market_locale" ADD CONSTRAINT "market_locale_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "store"."market"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store"."market_sales_channel" ADD CONSTRAINT "market_sales_channel_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "store"."market"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store"."market_sales_channel" ADD CONSTRAINT "market_sales_channel_sales_channel_id_sales_channel_id_fk" FOREIGN KEY ("sales_channel_id") REFERENCES "store"."sales_channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "market_store_code_unique" ON "store"."market" USING btree ("store_id","code") WHERE "store"."market"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "market_store_default_unique" ON "store"."market" USING btree ("store_id") WHERE "store"."market"."is_default" = true AND "store"."market"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "market_store_status_idx" ON "store"."market" USING btree ("store_id","status","id");--> statement-breakpoint
CREATE INDEX "market_store_currency_idx" ON "store"."market" USING btree ("store_id","default_currency_code","id");--> statement-breakpoint
CREATE INDEX "market_deleted_at_idx" ON "store"."market" USING btree ("deleted_at") WHERE "store"."market"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "market_country_primary_unique" ON "store"."market_country" USING btree ("market_id") WHERE "store"."market_country"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "market_country_store_country_idx" ON "store"."market_country" USING btree ("store_id","country_code","market_id");--> statement-breakpoint
CREATE INDEX "market_currency_store_currency_idx" ON "store"."market_currency" USING btree ("store_id","currency_code","market_id");--> statement-breakpoint
CREATE INDEX "market_locale_store_locale_idx" ON "store"."market_locale" USING btree ("store_id","locale_code","market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_channel_store_code_unique" ON "store"."sales_channel" USING btree ("store_id","code") WHERE "store"."sales_channel"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_channel_store_default_unique" ON "store"."sales_channel" USING btree ("store_id") WHERE "store"."sales_channel"."is_default" = true AND "store"."sales_channel"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "sales_channel_store_status_idx" ON "store"."sales_channel" USING btree ("store_id","status","id");--> statement-breakpoint
CREATE INDEX "sales_channel_store_type_idx" ON "store"."sales_channel" USING btree ("store_id","type","id");--> statement-breakpoint
CREATE INDEX "sales_channel_deleted_at_idx" ON "store"."sales_channel" USING btree ("deleted_at") WHERE "store"."sales_channel"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "market_sales_channel_store_channel_idx" ON "store"."market_sales_channel" USING btree ("store_id","sales_channel_id","market_id");--> statement-breakpoint
CREATE INDEX "idx_store_application" ON "store"."store" USING btree ("application_id");