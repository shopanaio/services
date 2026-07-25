-- Up Migration

CREATE TABLE "app_shopana_headless"."storefront_access_policies" (
  "connection_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "storefront_access_policies_pkey" PRIMARY KEY ("connection_id"),
  CONSTRAINT "storefront_access_policies_connection_id_connections_id_fk"
    FOREIGN KEY ("connection_id")
    REFERENCES "app_shopana_headless"."storefront_connections" ("id")
);

CREATE TABLE "app_shopana_headless"."storefront_access_policy_grants" (
  "connection_id" uuid NOT NULL,
  "permission" varchar(128) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "storefront_access_policy_grants_pkey"
    PRIMARY KEY ("connection_id", "permission"),
  CONSTRAINT "storefront_access_policy_grants_connection_id_policies_id_fk"
    FOREIGN KEY ("connection_id")
    REFERENCES "app_shopana_headless"."storefront_access_policies" ("connection_id")
);

CREATE INDEX "storefront_access_policies_store_connection_idx"
  ON "app_shopana_headless"."storefront_access_policies" ("store_id", "connection_id");

CREATE INDEX "storefront_access_policies_organization_connection_idx"
  ON "app_shopana_headless"."storefront_access_policies" ("organization_id", "connection_id");
