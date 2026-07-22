CREATE TABLE "customers"."storefront_auth_configuration" (
  "store_id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "storefront_auth_configuration_application_unique"
  ON "customers"."storefront_auth_configuration" ("application_id");
