CREATE TABLE "customers"."storefront_auth_configuration" (
  "store_id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "storefront_auth_configuration_application_unique"
  ON "customers"."storefront_auth_configuration" ("application_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'store'
      AND table_name = 'store'
      AND column_name = 'application_id'
  ) THEN
    INSERT INTO "customers"."storefront_auth_configuration" (
      "store_id",
      "organization_id",
      "application_id",
      "created_at",
      "updated_at"
    )
    SELECT
      "id",
      "organization_id",
      "application_id",
      "created_at",
      "updated_at"
    FROM "store"."store"
    WHERE "application_id" IS NOT NULL
    ON CONFLICT ("store_id") DO NOTHING;
  END IF;
END
$$;
