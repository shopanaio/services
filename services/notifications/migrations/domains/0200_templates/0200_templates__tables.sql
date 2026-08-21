CREATE TABLE "notifications"."notification_template_revisions" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "definition_key" varchar(128) NOT NULL,
  "channel" "notifications"."notification_channel" NOT NULL,
  "locale" varchar(16) NOT NULL,
  "revision" integer NOT NULL CHECK ("revision" >= 1),
  "subject_template" text,
  "body_template" text NOT NULL,
  "plain_text_template" text,
  "source_hash" varchar(64) NOT NULL,
  "validation_status" "notifications"."template_validation_status"
    NOT NULL DEFAULT 'VALID',
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_template_revision_identity"
    UNIQUE ("store_id", "definition_key", "channel", "locale", "revision")
);

CREATE INDEX "notification_template_revision_lookup_idx"
  ON "notifications"."notification_template_revisions"
  ("store_id", "definition_key", "channel", "locale");

CREATE TABLE "notifications"."notification_template_active_revisions" (
  "store_id" uuid NOT NULL,
  "definition_key" varchar(128) NOT NULL,
  "channel" "notifications"."notification_channel" NOT NULL,
  "locale" varchar(16) NOT NULL,
  "revision_id" uuid NOT NULL
    REFERENCES "notifications"."notification_template_revisions"("id")
    ON DELETE RESTRICT,
  "updated_by" text,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_template_active_identity"
    UNIQUE ("store_id", "definition_key", "channel", "locale")
);

CREATE FUNCTION "notifications"."reject_template_revision_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'notification template revisions are immutable';
END;
$$;

CREATE TRIGGER "notification_template_revisions_immutable"
BEFORE UPDATE OR DELETE
ON "notifications"."notification_template_revisions"
FOR EACH ROW EXECUTE FUNCTION "notifications"."reject_template_revision_mutation"();
