UPDATE "catalog"."bundle"
SET "display_style" = upper("display_style")
WHERE "display_style" <> upper("display_style");--> statement-breakpoint
ALTER TABLE "catalog"."bundle" ALTER COLUMN "display_style" SET DEFAULT 'ACCORDION';--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    JOIN pg_namespace namespace_row
      ON namespace_row.oid = constraint_row.connamespace
    WHERE constraint_row.conname = 'bundle_display_style_check'
      AND namespace_row.nspname = 'catalog'
  ) THEN
    ALTER TABLE "catalog"."bundle"
      ADD CONSTRAINT "bundle_display_style_check"
      CHECK ("display_style" IN ('ACCORDION', 'TABS', 'FLAT', 'WIZARD'));
  END IF;
END $$;
