-- Up Migration

CREATE TYPE "app_shopana_headless"."app_storefront_credential_kind" AS ENUM (
  'PUBLIC',
  'PRIVATE'
);

CREATE TYPE "app_shopana_headless"."app_storefront_credential_status" AS ENUM (
  'ACTIVE',
  'REVOKED'
);

CREATE TABLE "app_shopana_headless"."storefront_credentials" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "kind" "app_shopana_headless"."app_storefront_credential_kind" NOT NULL,
  "status" "app_shopana_headless"."app_storefront_credential_status" DEFAULT 'ACTIVE' NOT NULL,
  "kid" varchar(64) NOT NULL,
  "token_version" smallint NOT NULL,
  "pepper_version" smallint NOT NULL,
  "token_digest" bytea NOT NULL,
  "public_token_ciphertext" text,
  "label" varchar(255),
  "token_hint" varchar(16) NOT NULL,
  "created_by_type" varchar(16) NOT NULL,
  "created_by_id" varchar(255),
  "revoked_by_type" varchar(16),
  "revoked_by_id" varchar(255),
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "storefront_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "storefront_credentials_connection_id_connections_id_fk"
    FOREIGN KEY ("connection_id")
    REFERENCES "app_shopana_headless"."storefront_connections" ("id"),
  CONSTRAINT "storefront_credentials_public_token_ciphertext_check"
    CHECK (
      (
        "kind" = 'PUBLIC'
        AND "public_token_ciphertext" IS NOT NULL
      )
      OR
      (
        "kind" = 'PRIVATE'
        AND "public_token_ciphertext" IS NULL
      )
    ),
  CONSTRAINT "storefront_credentials_revoked_at_check"
    CHECK (
      (
        "status" = 'ACTIVE'
        AND "revoked_at" IS NULL
      )
      OR
      (
        "status" = 'REVOKED'
        AND "revoked_at" IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX "storefront_credentials_kid_key"
  ON "app_shopana_headless"."storefront_credentials" ("kid");

CREATE UNIQUE INDEX "storefront_credentials_token_digest_key"
  ON "app_shopana_headless"."storefront_credentials" ("token_digest");

CREATE UNIQUE INDEX "storefront_credentials_active_public_connection_key"
  ON "app_shopana_headless"."storefront_credentials" ("connection_id")
  WHERE "kind" = 'PUBLIC' AND "status" = 'ACTIVE';

CREATE INDEX "storefront_credentials_connection_kind_status_created_idx"
  ON "app_shopana_headless"."storefront_credentials" (
    "connection_id",
    "kind",
    "status",
    "created_at"
  );

CREATE INDEX "storefront_credentials_store_status_idx"
  ON "app_shopana_headless"."storefront_credentials" ("store_id", "status");

CREATE INDEX "storefront_credentials_organization_status_idx"
  ON "app_shopana_headless"."storefront_credentials" ("organization_id", "status");
