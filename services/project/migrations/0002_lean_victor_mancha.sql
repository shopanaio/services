ALTER TABLE "project"."currency" ADD COLUMN "exchange_rate_amount" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "project"."currency" ADD COLUMN "exchange_rate_scale" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "project"."currency"
SET "exchange_rate_scale" = 8,
    "exchange_rate_amount" = ROUND(("exchange_rate"::numeric) * 100000000)::bigint
WHERE "exchange_rate" <> 1;--> statement-breakpoint
ALTER TABLE "project"."project" ADD COLUMN "base_currency" "reference"."currency_code" DEFAULT 'USD' NOT NULL;
--> statement-breakpoint
UPDATE "project"."project"
SET "base_currency" = "default_currency";--> statement-breakpoint
