-- Up Migration

CREATE TABLE "apps"."app_installations" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "app_code" varchar(128) NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "status" "apps"."app_installation_status" DEFAULT 'PENDING_CONSENT' NOT NULL,
  "installed_version" varchar(64),
  "target_version" varchar(64),
  "manifest_hash" varchar(64),
  "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "configuration_version" integer DEFAULT 1 NOT NULL,
  "installed_by_user_id" varchar(128),
  "health_status" "apps"."app_installation_health_status" DEFAULT 'UNKNOWN' NOT NULL,
  "last_error_code" varchar(128),
  "last_error_message" text,
  "installed_at" timestamp with time zone,
  "suspended_at" timestamp with time zone,
  "uninstalled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_installations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_installations_active_store_app_key"
  ON "apps"."app_installations" ("store_id", "app_code")
  WHERE "status" <> 'UNINSTALLED';

CREATE INDEX "app_installations_store_status_idx"
  ON "apps"."app_installations" ("store_id", "status");

CREATE INDEX "app_installations_organization_idx"
  ON "apps"."app_installations" ("organization_id");
