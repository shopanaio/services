-- Up Migration

CREATE SCHEMA IF NOT EXISTS "app_shopana_smtp";

CREATE TYPE "app_shopana_smtp"."smtp_connection_provider" AS ENUM (
  'CUSTOM',
  'SENDGRID',
  'MAILCHIMP_TRANSACTIONAL',
  'GOOGLE_WORKSPACE'
);

CREATE TYPE "app_shopana_smtp"."smtp_connection_status" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'DISCONNECTED'
);

CREATE TYPE "app_shopana_smtp"."smtp_connection_security" AS ENUM (
  'NONE',
  'STARTTLS',
  'TLS'
);

CREATE TABLE "app_shopana_smtp"."smtp_connections" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "provider" "app_shopana_smtp"."smtp_connection_provider" NOT NULL,
  "status" "app_shopana_smtp"."smtp_connection_status" DEFAULT 'INACTIVE' NOT NULL,
  "host" varchar(253) NOT NULL,
  "port" integer NOT NULL,
  "security" "app_shopana_smtp"."smtp_connection_security" NOT NULL,
  "username" varchar(320),
  "password_envelope" text,
  "created_by_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "disconnected_at" timestamp with time zone,
  CONSTRAINT "smtp_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smtp_connections_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id"),
  CONSTRAINT "smtp_connections_port_check"
    CHECK ("port" >= 1 AND "port" <= 65535)
);

CREATE INDEX "smtp_connections_installation_status_idx"
  ON "app_shopana_smtp"."smtp_connections" ("installation_id", "status");

CREATE INDEX "smtp_connections_store_status_idx"
  ON "app_shopana_smtp"."smtp_connections" ("store_id", "status");

CREATE UNIQUE INDEX "smtp_connections_one_active_per_installation_idx"
  ON "app_shopana_smtp"."smtp_connections" ("installation_id")
  WHERE "status" = 'ACTIVE';
