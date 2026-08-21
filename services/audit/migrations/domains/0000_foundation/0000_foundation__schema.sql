CREATE SCHEMA IF NOT EXISTS "audit";

CREATE TYPE "audit"."audit_action" AS ENUM (
  'CREATE', 'UPDATE', 'DELETE'
);

CREATE TYPE "audit"."audit_actor_type" AS ENUM (
  'USER', 'SERVICE', 'SYSTEM'
);

CREATE TYPE "audit"."audit_operation_action" AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'MOVE', 'LINK', 'UNLINK'
);

CREATE TABLE "audit"."audit_entries" (
  "event_id" text PRIMARY KEY,
  "organization_id" text NOT NULL,
  "store_id" text NOT NULL,
  "event_sequence" integer NOT NULL,
  "event_type" varchar(128) NOT NULL,
  "aggregate_type" varchar(64) NOT NULL,
  "aggregate_id" text NOT NULL,
  "action" "audit"."audit_action" NOT NULL,
  "command" varchar(128) NOT NULL,
  "actor_type" "audit"."audit_actor_type" NOT NULL,
  "actor_id" text,
  "source_service" varchar(64) NOT NULL,
  "parent_workflow_id" text,
  "correlation_id" text NOT NULL,
  "schema_version" smallint NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "recorded_at" timestamptz NOT NULL DEFAULT now(),
  "retention_until" timestamptz,
  "record_digest" varchar(64),
  CONSTRAINT "audit_entries_event_sequence_positive" CHECK ("event_sequence" > 0),
  CONSTRAINT "audit_entries_schema_version_positive" CHECK ("schema_version" > 0),
  CONSTRAINT "audit_entries_actor_identity" CHECK (
    ("actor_type" = 'USER' AND "actor_id" IS NOT NULL)
    OR "actor_type" <> 'USER'
  ),
  CONSTRAINT "audit_entries_subject_sequence_unique" UNIQUE (
    "organization_id", "aggregate_type", "aggregate_id", "event_sequence"
  )
);

CREATE TABLE "audit"."audit_operations" (
  "event_id" text NOT NULL REFERENCES "audit"."audit_entries" ("event_id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "operation_type" varchar(128) NOT NULL,
  "action" "audit"."audit_operation_action" NOT NULL,
  "target_type" varchar(64),
  "target_id" text,
  "changes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT "audit_operations_position_non_negative" CHECK ("position" >= 0),
  CONSTRAINT "audit_operations_target_identity" CHECK (
    ("target_type" IS NULL AND "target_id" IS NULL)
    OR ("target_type" IS NOT NULL AND "target_id" IS NOT NULL)
  ),
  PRIMARY KEY ("event_id", "position")
);

CREATE TABLE "audit"."audit_targets" (
  "event_id" text NOT NULL REFERENCES "audit"."audit_entries" ("event_id") ON DELETE CASCADE,
  "organization_id" text NOT NULL,
  "target_type" varchar(64) NOT NULL,
  "target_id" text NOT NULL,
  "is_root" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("event_id", "target_type", "target_id")
);

CREATE INDEX "audit_entries_store_timeline_idx"
  ON "audit"."audit_entries" ("organization_id", "store_id", "occurred_at" DESC, "event_id");

CREATE INDEX "audit_entries_aggregate_timeline_idx"
  ON "audit"."audit_entries" (
    "organization_id", "aggregate_type", "aggregate_id", "event_sequence" DESC
  );

CREATE INDEX "audit_entries_actor_timeline_idx"
  ON "audit"."audit_entries" ("organization_id", "actor_type", "actor_id", "occurred_at" DESC);

CREATE INDEX "audit_targets_timeline_idx"
  ON "audit"."audit_targets" ("organization_id", "target_type", "target_id", "event_id");
