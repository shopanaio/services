-- Up Migration

CREATE SCHEMA IF NOT EXISTS "app_shopana_headless";

CREATE TYPE "app_shopana_headless"."app_headless_storefront_connection_status" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'DISCONNECTED'
);

CREATE TABLE "app_shopana_headless"."storefront_connections" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "status" "app_shopana_headless"."app_headless_storefront_connection_status" DEFAULT 'ACTIVE' NOT NULL,
  "created_by_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "suspended_at" timestamp with time zone,
  "disconnected_at" timestamp with time zone,
  CONSTRAINT "storefront_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "storefront_connections_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
);

CREATE INDEX "storefront_connections_installation_status_idx"
  ON "app_shopana_headless"."storefront_connections" ("installation_id", "status");

CREATE INDEX "storefront_connections_store_status_idx"
  ON "app_shopana_headless"."storefront_connections" ("store_id", "status");

CREATE INDEX "storefront_connections_organization_status_idx"
  ON "app_shopana_headless"."storefront_connections" ("organization_id", "status");
