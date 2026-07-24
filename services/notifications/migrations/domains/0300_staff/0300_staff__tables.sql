CREATE TABLE "notifications"."staff_notification_recipients" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "user_id" uuid,
  "name" varchar(255) NOT NULL,
  "email_ciphertext" text NOT NULL,
  "email_hash" varchar(64) NOT NULL,
  "locale" varchar(16) NOT NULL DEFAULT 'en',
  "timezone" varchar(64) NOT NULL DEFAULT 'UTC',
  "scope" "notifications"."staff_recipient_scope"
    NOT NULL DEFAULT 'ALL_ORDERS',
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "staff_notification_recipient_store_email"
    UNIQUE ("store_id", "email_hash")
);

CREATE INDEX "staff_notification_recipient_store_enabled_idx"
  ON "notifications"."staff_notification_recipients" ("store_id", "enabled");

CREATE TABLE "notifications"."staff_notification_recipient_events" (
  "store_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL
    REFERENCES "notifications"."staff_notification_recipients"("id")
    ON DELETE CASCADE,
  "definition_key" varchar(128) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  CONSTRAINT "staff_notification_recipient_event_identity"
    UNIQUE ("recipient_id", "definition_key")
);

CREATE INDEX "staff_notification_recipient_event_lookup_idx"
  ON "notifications"."staff_notification_recipient_events"
  ("store_id", "definition_key", "enabled");

CREATE TABLE "notifications"."staff_notification_schedules" (
  "store_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "definition_key" varchar(128) NOT NULL,
  "cron" varchar(64) NOT NULL,
  "timezone" varchar(64) NOT NULL,
  "next_run_at" timestamptz,
  "last_run_at" timestamptz,
  "enabled" boolean NOT NULL DEFAULT false,
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "staff_notification_schedule_identity"
    UNIQUE ("store_id", "definition_key")
);

CREATE INDEX "staff_notification_schedule_due_idx"
  ON "notifications"."staff_notification_schedules"
  ("enabled", "next_run_at");
