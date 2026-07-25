-- Up Migration

CREATE TABLE "apps"."app_sales_channel_connections" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "installation_id" uuid NOT NULL,
  "specification_snapshot_id" uuid NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "external_account_id" varchar(255),
  "external_account_label" varchar(255),
  "status" "apps"."app_sales_channel_connection_status" DEFAULT 'DRAFT' NOT NULL,
  "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "configuration_version" integer DEFAULT 1 NOT NULL,
  "health_status" "apps"."app_sales_channel_health_status" DEFAULT 'UNKNOWN' NOT NULL,
  "last_error_code" varchar(128),
  "last_error_message" text,
  "connected_at" timestamp with time zone,
  "suspended_at" timestamp with time zone,
  "disconnected_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_sales_channel_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_sales_channel_connections_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT "app_sales_channel_connections_specification_snapshot_id_app_sales_channel_specification_snapshots_id_fk"
    FOREIGN KEY ("specification_snapshot_id")
    REFERENCES "apps"."app_sales_channel_specification_snapshots" ("id")
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

CREATE INDEX "app_sales_channel_connections_store_status_idx"
  ON "apps"."app_sales_channel_connections" ("store_id", "status", "id");

CREATE INDEX "app_sales_channel_connections_installation_status_idx"
  ON "apps"."app_sales_channel_connections" (
    "installation_id",
    "status",
    "id"
  );

CREATE INDEX "app_sales_channel_connections_specification_idx"
  ON "apps"."app_sales_channel_connections" ("specification_snapshot_id");

CREATE UNIQUE INDEX "app_sales_channel_connections_external_account_key"
  ON "apps"."app_sales_channel_connections" (
    "store_id",
    "installation_id",
    "specification_snapshot_id",
    "external_account_id"
  )
  WHERE "status" <> 'DISCONNECTED'
    AND "external_account_id" IS NOT NULL;
