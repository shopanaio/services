-- Up Migration
CREATE TABLE "payments"."checkout_method_execution" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(), "snapshot_id" uuid NOT NULL, "store_id" uuid NOT NULL,
  "sequence" integer NOT NULL, "kind" text NOT NULL, "owner_id" text NOT NULL,
  "status" text NOT NULL, "classification" text, "revision" text, "audit" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_method_execution_snapshot_fk" FOREIGN KEY ("store_id", "snapshot_id") REFERENCES "payments"."checkout_method_snapshot" ("store_id", "id") ON DELETE CASCADE,
  CONSTRAINT "checkout_method_execution_sequence_unique" UNIQUE ("snapshot_id", "kind", "sequence"),
  CONSTRAINT "checkout_method_execution_audit_check" CHECK (jsonb_typeof("audit") = 'object')
);
