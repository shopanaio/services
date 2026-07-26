-- Up Migration

CREATE TABLE "app_shopana_headless"."storefront_mutation_idempotency" (
  "installation_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "operation" varchar(64) NOT NULL,
  "client_mutation_id" varchar(255) NOT NULL,
  "resource_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "storefront_mutation_idempotency_pkey"
    PRIMARY KEY ("installation_id", "operation", "client_mutation_id"),
  CONSTRAINT "storefront_mutation_idempotency_installation_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
);

CREATE INDEX "storefront_mutation_idempotency_tenant_idx"
  ON "app_shopana_headless"."storefront_mutation_idempotency" (
    "organization_id",
    "store_id",
    "created_at"
  );
