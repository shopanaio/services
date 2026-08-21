-- Up Migration

CREATE TABLE "pricing"."checkout_preliminary_quote" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "based_on_checkout_version" integer NOT NULL,
  "execution_id" text NOT NULL,
  "request_digest" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_preliminary_quote_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "checkout_preliminary_quote_attempt_unique" UNIQUE ("store_id", "checkout_id", "based_on_checkout_version", "execution_id"),
  CONSTRAINT "checkout_preliminary_quote_version_check" CHECK ("based_on_checkout_version" >= 0),
  CONSTRAINT "checkout_preliminary_quote_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "checkout_preliminary_quote_text_check" CHECK (length("request_digest") > 0)
);

CREATE INDEX "checkout_preliminary_quote_checkout_created_idx" ON "pricing"."checkout_preliminary_quote" ("store_id", "checkout_id", "created_at" DESC);

CREATE TABLE "pricing"."checkout_final_quote" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "based_on_checkout_version" integer NOT NULL,
  "execution_id" text NOT NULL,
  "preliminary_quote_id" uuid NOT NULL,
  "request_digest" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_final_quote_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "checkout_final_quote_attempt_unique" UNIQUE ("store_id", "checkout_id", "based_on_checkout_version", "execution_id"),
  CONSTRAINT "checkout_final_quote_preliminary_fk" FOREIGN KEY ("preliminary_quote_id") REFERENCES "pricing"."checkout_preliminary_quote" ("id") ON DELETE RESTRICT,
  CONSTRAINT "checkout_final_quote_version_check" CHECK ("based_on_checkout_version" >= 0),
  CONSTRAINT "checkout_final_quote_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "checkout_final_quote_text_check" CHECK (length("request_digest") > 0)
);

CREATE INDEX "checkout_final_quote_checkout_created_idx" ON "pricing"."checkout_final_quote" ("store_id", "checkout_id", "created_at" DESC);
