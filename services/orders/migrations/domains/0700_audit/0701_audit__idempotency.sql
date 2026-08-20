-- Up Migration

CREATE TABLE "orders"."idempotency_records" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "operation" varchar(128) NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "status" "orders"."order_idempotency_status" NOT NULL DEFAULT 'IN_PROGRESS',
  "resource_type" varchar(128),
  "resource_id" uuid,
  "response_status" integer,
  "response" jsonb,
  "failure_code" text,
  "locked_until" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "idempotency_records_store_operation_key_unique"
    UNIQUE ("store_id", "operation", "idempotency_key"),
  CONSTRAINT "idempotency_records_operation_check" CHECK (btrim("operation") <> ''),
  CONSTRAINT "idempotency_records_request_hash_check" CHECK (
    "request_hash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "idempotency_records_resource_check" CHECK (
    ("resource_type" IS NULL) = ("resource_id" IS NULL)
  ),
  CONSTRAINT "idempotency_records_response_status_check" CHECK (
    "response_status" IS NULL OR "response_status" BETWEEN 100 AND 599
  ),
  CONSTRAINT "idempotency_records_result_check" CHECK (
    ("status" = 'IN_PROGRESS' AND "response_status" IS NULL)
    OR ("status" = 'COMPLETED' AND "response_status" IS NOT NULL AND "response" IS NOT NULL)
    OR ("status" = 'FAILED' AND "failure_code" IS NOT NULL)
  ),
  CONSTRAINT "idempotency_records_timestamps_check" CHECK (
    ("locked_until" IS NULL OR "locked_until" >= "created_at")
    AND ("expires_at" IS NULL OR "expires_at" >= "created_at")
  )
);

CREATE INDEX "idempotency_records_expiry_idx"
  ON "orders"."idempotency_records" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

CREATE INDEX "idempotency_records_in_progress_lock_idx"
  ON "orders"."idempotency_records" ("locked_until")
  WHERE "status" = 'IN_PROGRESS';

CREATE TRIGGER "idempotency_records_touch_updated_at"
BEFORE UPDATE ON "orders"."idempotency_records"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();
