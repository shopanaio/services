DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "store"."store"
    WHERE "application_id" IS NOT NULL
  ) THEN
    IF to_regclass('customers.storefront_auth_configuration') IS NULL THEN
      RAISE EXCEPTION
        'Run the customers storefront auth migration before dropping store.application_id';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "store"."store" AS source_store
      LEFT JOIN "customers"."storefront_auth_configuration" AS target_auth
        ON target_auth."store_id" = source_store."id"
        AND target_auth."organization_id" = source_store."organization_id"
        AND target_auth."application_id" = source_store."application_id"
      WHERE source_store."application_id" IS NOT NULL
        AND target_auth."store_id" IS NULL
    ) THEN
      RAISE EXCEPTION
        'Customers storefront auth backfill is incomplete';
    END IF;
  END IF;
END
$$;--> statement-breakpoint
DROP INDEX "store"."idx_store_application";--> statement-breakpoint
ALTER TABLE "store"."store" DROP COLUMN "application_id";
