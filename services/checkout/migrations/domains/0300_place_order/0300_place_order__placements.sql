-- Up Migration
CREATE TABLE "checkout"."checkout_placements" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "credential_id" text NOT NULL,
  "workflow_id" text NOT NULL,
  "request_input" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'CLAIMED',
  "discount_reservation_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "discount_redemption_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "loyalty_reservation" jsonb,
  "requested_order_id" uuid,
  "order_id" uuid,
  "payment_collection_id" uuid,
  "payment_session_id" uuid,
  "payment_operation_id" uuid,
  "payment_monitor_input" jsonb,
  "payment_monitor_workflow_id" text,
  "compensation_failures" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "failure" jsonb,
  "result" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_placements_checkout_unique"
    UNIQUE ("store_id", "checkout_id"),
  CONSTRAINT "checkout_placements_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "checkout_placements_idempotency_not_blank_check"
    CHECK (length(btrim("idempotency_key")) > 0),
  CONSTRAINT "checkout_placements_request_hash_not_blank_check"
    CHECK (length(btrim("request_hash")) > 0),
  CONSTRAINT "checkout_placements_credential_id_not_blank_check"
    CHECK (length(btrim("credential_id")) BETWEEN 1 AND 256),
  CONSTRAINT "checkout_placements_workflow_id_not_blank_check"
    CHECK (length(btrim("workflow_id")) > 0),
  CONSTRAINT "checkout_placements_request_input_check"
    CHECK (jsonb_typeof("request_input") = 'object'),
  CONSTRAINT "checkout_placements_payment_monitor_input_check"
    CHECK ("payment_monitor_input" IS NULL OR jsonb_typeof("payment_monitor_input") = 'object'),
  CONSTRAINT "checkout_placements_status_check"
    CHECK ("status" IN (
      'CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED',
      'PAYMENT_CREATED', 'PLACED', 'FAILED'
    )),
  CONSTRAINT "checkout_placements_reservation_ids_check"
    CHECK (jsonb_typeof("discount_reservation_ids") = 'array'),
  CONSTRAINT "checkout_placements_redemption_ids_check"
    CHECK (jsonb_typeof("discount_redemption_ids") = 'array'),
  CONSTRAINT "checkout_placements_compensation_failures_check"
    CHECK (jsonb_typeof("compensation_failures") = 'array'),
  CONSTRAINT "checkout_placements_result_check"
    CHECK (
      ("status" = 'PLACED' AND "result" IS NOT NULL AND jsonb_typeof("result") = 'object')
      OR ("status" <> 'PLACED' AND "result" IS NULL)
    ),
  CONSTRAINT "checkout_placements_failure_check"
    CHECK (
      ("status" = 'FAILED' AND "failure" IS NOT NULL AND jsonb_typeof("failure") = 'object')
      OR ("status" <> 'FAILED' AND "failure" IS NULL)
    )
);

CREATE INDEX "checkout_placements_status_idx"
  ON "checkout"."checkout_placements" ("status", "updated_at");
