CREATE TABLE "notifications"."webhook_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "event_type" varchar(128) NOT NULL,
  "format" "notifications"."webhook_format" NOT NULL,
  "url" text NOT NULL,
  "api_version" varchar(32) NOT NULL,
  "status" "notifications"."webhook_status" NOT NULL DEFAULT 'ACTIVE',
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "webhook_subscription_store_event_url"
    UNIQUE ("store_id", "event_type", "url")
);

CREATE INDEX "webhook_subscription_store_status_idx"
  ON "notifications"."webhook_subscriptions" ("store_id", "status");

CREATE TABLE "notifications"."webhook_secret_versions" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "subscription_id" uuid NOT NULL
    REFERENCES "notifications"."webhook_subscriptions"("id")
    ON DELETE CASCADE,
  "version" integer NOT NULL CHECK ("version" >= 1),
  "secret_ciphertext" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "grace_expires_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "webhook_secret_version_identity"
    UNIQUE ("subscription_id", "version")
);

CREATE INDEX "webhook_secret_active_idx"
  ON "notifications"."webhook_secret_versions"
  ("store_id", "subscription_id", "active");
