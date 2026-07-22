ALTER TABLE "store"."store" DROP CONSTRAINT "store_id_base_currency_currency_store_id_code_fk";
--> statement-breakpoint
ALTER TABLE "store"."store" DROP CONSTRAINT "store_id_default_currency_currency_store_id_code_fk";
--> statement-breakpoint
ALTER TABLE "store"."currency" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "store"."currency" CASCADE;--> statement-breakpoint
ALTER TABLE "store"."store" ADD COLUMN "currency_code" "store"."currency_code" NOT NULL;--> statement-breakpoint
ALTER TABLE "store"."store" DROP COLUMN "base_currency";--> statement-breakpoint
ALTER TABLE "store"."store" DROP COLUMN "default_currency";
