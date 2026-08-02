-- Up Migration
CREATE TABLE "payments"."payment_customization" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(), "store_id" uuid NOT NULL,
  "status" "payments"."customization_status" NOT NULL, "policy_revision" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_customization_store_id_id_unique" UNIQUE ("store_id", "id")
);
