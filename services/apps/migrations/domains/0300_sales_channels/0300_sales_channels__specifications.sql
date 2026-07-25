-- Up Migration

CREATE TABLE "apps"."app_sales_channel_specification_snapshots" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "app_code" varchar(128) NOT NULL,
  "app_version" varchar(64) NOT NULL,
  "manifest_hash" varchar(64) NOT NULL,
  "handle" varchar(128) NOT NULL,
  "label" varchar(255) NOT NULL,
  "definition" jsonb NOT NULL,
  "definition_hash" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_sales_channel_specification_snapshots_pkey"
    PRIMARY KEY ("id"),
  CONSTRAINT "app_sales_channel_specification_version_key"
    UNIQUE ("installation_id", "app_version", "manifest_hash", "handle"),
  CONSTRAINT "app_sales_channel_specification_snapshots_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

CREATE INDEX "app_sales_channel_specification_installation_idx"
  ON "apps"."app_sales_channel_specification_snapshots" (
    "installation_id",
    "handle"
  );
