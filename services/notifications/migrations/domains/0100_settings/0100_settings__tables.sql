CREATE TABLE "notifications"."notification_definition_settings" (
  "store_id" uuid NOT NULL,
  "definition_key" varchar(128) NOT NULL,
  "enabled" boolean NOT NULL,
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "updated_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_definition_settings_store_key"
    UNIQUE ("store_id", "definition_key")
);

CREATE TABLE "notifications"."notification_channel_settings" (
  "store_id" uuid NOT NULL,
  "definition_key" varchar(128) NOT NULL,
  "channel" "notifications"."notification_channel" NOT NULL,
  "enabled" boolean NOT NULL,
  "sender_name" varchar(255),
  "sender_email" varchar(320),
  "reply_to" varchar(320),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_channel_settings_store_key_channel"
    UNIQUE ("store_id", "definition_key", "channel")
);
