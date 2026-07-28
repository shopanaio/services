CREATE TABLE "notifications"."notification_occurrences" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "definition_key" varchar(128) NOT NULL,
  "source_event_id" varchar(128),
  "source_event_type" varchar(128),
  "source_service" varchar(64) NOT NULL,
  "source_idempotency_key" varchar(255) NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  "subject_id" varchar(255) NOT NULL,
  "correlation_id" varchar(128) NOT NULL,
  "data_snapshot" text NOT NULL,
  "status" "notifications"."notification_occurrence_status"
    NOT NULL DEFAULT 'PENDING',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_occurrence_idempotency"
    UNIQUE ("store_id", "source_idempotency_key", "definition_key")
);

CREATE INDEX "notification_occurrence_store_created_idx"
  ON "notifications"."notification_occurrences" ("store_id", "created_at" DESC);

CREATE TABLE "notifications"."notification_recipients" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "occurrence_id" uuid NOT NULL
    REFERENCES "notifications"."notification_occurrences"("id")
    ON DELETE CASCADE,
  "recipient_ref" varchar(255) NOT NULL,
  "customer_id" uuid,
  "user_id" text,
  "email_ciphertext" text,
  "phone_ciphertext" text,
  "address_hash" varchar(64),
  "locale" varchar(16),
  "display_name" varchar(255),
  "suppression_result" varchar(64),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_recipient_occurrence_ref"
    UNIQUE ("occurrence_id", "recipient_ref")
);

CREATE INDEX "notification_recipient_store_occurrence_idx"
  ON "notifications"."notification_recipients" ("store_id", "occurrence_id");

CREATE TABLE "notifications"."notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "occurrence_id" uuid NOT NULL
    REFERENCES "notifications"."notification_occurrences"("id")
    ON DELETE CASCADE,
  "recipient_id" uuid NOT NULL
    REFERENCES "notifications"."notification_recipients"("id")
    ON DELETE CASCADE,
  "channel" "notifications"."notification_channel" NOT NULL,
  "purpose" "notifications"."notification_purpose"
    NOT NULL DEFAULT 'BUSINESS',
  "status" "notifications"."notification_delivery_status"
    NOT NULL DEFAULT 'PENDING',
  "provider_code" varchar(128),
  "provider_slot_id" uuid,
  "provider_message_id" varchar(255),
  "template_revision_id" uuid,
  "template_source_version" varchar(64),
  "locale" varchar(16),
  "content_hash" varchar(64),
  "rendered_content" text,
  "idempotency_key" varchar(255) NOT NULL,
  "next_attempt_at" timestamptz,
  "attempt_count" integer NOT NULL DEFAULT 0 CHECK ("attempt_count" >= 0),
  "last_error_kind" varchar(64),
  "last_error_code" varchar(128),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_delivery_identity"
    UNIQUE ("occurrence_id", "recipient_id", "channel"),
  CONSTRAINT "notification_delivery_idempotency_key"
    UNIQUE ("idempotency_key")
);

CREATE INDEX "notification_delivery_operational_idx"
  ON "notifications"."notification_deliveries"
  ("store_id", "status", "next_attempt_at");

CREATE TABLE "notifications"."notification_delivery_attempts" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "delivery_id" uuid NOT NULL
    REFERENCES "notifications"."notification_deliveries"("id")
    ON DELETE CASCADE,
  "attempt_number" integer NOT NULL CHECK ("attempt_number" >= 1),
  "workflow_id" varchar(255) NOT NULL,
  "provider_code" varchar(128),
  "provider_slot_id" uuid,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,
  "status" "notifications"."notification_attempt_status"
    NOT NULL DEFAULT 'STARTED',
  "error_kind" varchar(64),
  "error_code" varchar(128),
  "provider_response_code" varchar(128),
  "provider_message_id" varchar(255),
  "diagnostics" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "notification_delivery_attempt_identity"
    UNIQUE ("delivery_id", "attempt_number")
);

CREATE INDEX "notification_delivery_attempt_store_delivery_idx"
  ON "notifications"."notification_delivery_attempts" ("store_id", "delivery_id");
