-- Up Migration

CREATE TABLE "orders"."order_cancellations" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "reason" "orders"."order_cancellation_reason" NOT NULL,
  "note" text,
  "cancelled_by_type" "orders"."order_actor_type" NOT NULL,
  "cancelled_by_id" uuid,
  "idempotency_key" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "cancelled_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_cancellations_pkey" PRIMARY KEY ("store_id", "order_id"),
  CONSTRAINT "order_cancellations_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_cancellations_actor_check" CHECK (
    "cancelled_by_type" = 'SYSTEM' OR "cancelled_by_id" IS NOT NULL
  ),
  CONSTRAINT "order_cancellations_idempotency_key"
    UNIQUE ("store_id", "idempotency_key")
);

CREATE INDEX "order_cancellations_store_cancelled_at_idx"
  ON "orders"."order_cancellations" ("store_id", "cancelled_at" DESC, "order_id");

CREATE TRIGGER "order_cancellations_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_cancellations"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();
