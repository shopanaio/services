CREATE TABLE "notifications"."notification_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "actor_id" uuid,
  "action" varchar(128) NOT NULL,
  "entity_type" varchar(64) NOT NULL,
  "entity_id" varchar(255) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "notification_audit_store_created_idx"
  ON "notifications"."notification_audit_events" ("store_id", "created_at" DESC);
