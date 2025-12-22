CREATE SCHEMA "project";
--> statement-breakpoint
CREATE SCHEMA "reference";
--> statement-breakpoint
CREATE TYPE "reference"."currency_code" AS ENUM('AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'FOK', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL');--> statement-breakpoint
CREATE TYPE "reference"."dimension_unit" AS ENUM('mm', 'cm', 'm', 'in', 'ft');--> statement-breakpoint
CREATE TYPE "reference"."locale_code" AS ENUM('ak', 'sq', 'am', 'ar', 'hy', 'as', 'az', 'bm', 'bn', 'eu', 'be', 'bs', 'br', 'bg', 'my', 'ca', 'ckb', 'ce', 'zh-CN', 'zh-TW', 'kw', 'hr', 'cs', 'da', 'nl', 'dz', 'en', 'eo', 'et', 'ee', 'fo', 'fil', 'fi', 'fr', 'ff', 'gl', 'lg', 'ka', 'de', 'el', 'gu', 'ha', 'he', 'hi', 'hu', 'is', 'ig', 'id', 'ia', 'ga', 'it', 'ja', 'jv', 'kl', 'kn', 'ks', 'kk', 'km', 'ki', 'rw', 'ko', 'ku', 'ky', 'lo', 'lv', 'ln', 'lt', 'lu', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'gv', 'mr', 'mn', 'mi', 'ne', 'nd', 'se', 'no', 'nb', 'nn', 'or', 'om', 'os', 'ps', 'fa', 'pl', 'pt-BR', 'pt-PT', 'pa', 'qu', 'ro', 'rm', 'rn', 'ru', 'sg', 'sa', 'sc', 'gd', 'sr', 'sn', 'ii', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'bo', 'ti', 'to', 'tr', 'tk', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'fy', 'wo', 'xh', 'yi', 'yo', 'zu');--> statement-breakpoint
CREATE TYPE "reference"."weight_unit" AS ENUM('kg', 'g', 'lb', 'oz');--> statement-breakpoint
CREATE TYPE "project"."project_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "project"."integration_status" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "project"."integration_type" AS ENUM('iam', 'payment', 'shipping', 'storage', 'email', 'analytics');--> statement-breakpoint
CREATE TABLE "project"."locale" (
	"project_id" uuid NOT NULL,
	"code" "reference"."locale_code" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "locale_project_id_code_pk" PRIMARY KEY("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "project"."currency" (
	"project_id" uuid NOT NULL,
	"code" "reference"."currency_code" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"exchange_rate_amount" bigint DEFAULT 1 NOT NULL,
	"exchange_rate_scale" integer NOT NULL,
	"exchange_rate" real NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "currency_project_id_code_pk" PRIMARY KEY("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "project"."project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"external_system" varchar(64),
	"external_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"status" "project"."project_status" DEFAULT 'active' NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"email" varchar(255),
	"default_locale" "reference"."locale_code" NOT NULL,
	"base_currency" "reference"."currency_code" NOT NULL,
	"default_currency" "reference"."currency_code" NOT NULL,
	"default_weight_unit" "reference"."weight_unit" NOT NULL,
	"default_dimension_unit" "reference"."dimension_unit" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project"."api_key" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key" varchar(64) NOT NULL,
	"created_by_id" uuid NOT NULL,
	"due_date" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"is_banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project"."project_integration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "project"."integration_type" NOT NULL,
	"provider" varchar(64) NOT NULL,
	"status" "project"."integration_status" DEFAULT 'active' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"last_sync_at" timestamp with time zone,
	"error_message" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project"."project" ADD CONSTRAINT "project_id_default_locale_locale_project_id_code_fk" FOREIGN KEY ("id","default_locale") REFERENCES "project"."locale"("project_id","code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project"."project" ADD CONSTRAINT "project_id_base_currency_currency_project_id_code_fk" FOREIGN KEY ("id","base_currency") REFERENCES "project"."currency"("project_id","code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project"."project" ADD CONSTRAINT "project_id_default_currency_currency_project_id_code_fk" FOREIGN KEY ("id","default_currency") REFERENCES "project"."currency"("project_id","code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project"."api_key" ADD CONSTRAINT "api_key_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project"."project_integration" ADD CONSTRAINT "project_integration_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_locale_project_id" ON "project"."locale" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_locale_is_active" ON "project"."locale" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_currency_project_id" ON "project"."currency" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_currency_is_active" ON "project"."currency" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_key" ON "project"."project" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_project_status" ON "project"."project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_project_created_at" ON "project"."project" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_project_deleted_at" ON "project"."project" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_project_external" ON "project"."project" USING btree ("external_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_key_unique" ON "project"."api_key" USING btree ("key") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_api_key_project_id" ON "project"."api_key" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_api_key_created_by_id" ON "project"."api_key" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "idx_api_key_deleted_at" ON "project"."api_key" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_project_integration_unique" ON "project"."project_integration" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "idx_project_integration_project_id" ON "project"."project_integration" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_integration_type" ON "project"."project_integration" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_project_integration_status" ON "project"."project_integration" USING btree ("status");