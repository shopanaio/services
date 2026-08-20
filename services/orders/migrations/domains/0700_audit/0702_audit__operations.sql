-- Up Migration

CREATE TABLE "orders"."order_operations" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid,
  "kind" "orders"."order_operation_kind" NOT NULL,
  "status" "orders"."order_operation_status" NOT NULL DEFAULT 'PENDING',
  "resource_type" varchar(128),
  "resource_id" uuid,
  "workflow_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "progress_current" integer NOT NULL DEFAULT 0,
  "progress_total" integer,
  "failure_code" text,
  "failure_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_operations_store_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "order_operations_idempotency_unique" UNIQUE ("store_id", "kind", "idempotency_key"),
  CONSTRAINT "order_operations_workflow_unique" UNIQUE ("workflow_id"),
  CONSTRAINT "order_operations_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_operations_resource_check" CHECK (("resource_type" IS NULL) = ("resource_id" IS NULL)),
  CONSTRAINT "order_operations_progress_check" CHECK (
    "progress_current" >= 0 AND ("progress_total" IS NULL OR ("progress_total" >= 0 AND "progress_current" <= "progress_total"))
  ),
  CONSTRAINT "order_operations_terminal_check" CHECK (
    ("status" = 'FAILED' AND "failure_code" IS NOT NULL AND "completed_at" IS NOT NULL)
    OR ("status" IN ('SUCCEEDED', 'CANCELLED') AND "completed_at" IS NOT NULL)
    OR ("status" IN ('PENDING', 'RUNNING') AND "completed_at" IS NULL)
  )
);

CREATE INDEX "order_operations_pending_idx"
  ON "orders"."order_operations" ("status", "created_at", "id") WHERE "status" IN ('PENDING', 'RUNNING');

CREATE INDEX "order_operations_order_idx"
  ON "orders"."order_operations" ("store_id", "order_id", "created_at" DESC, "id" DESC) WHERE "order_id" IS NOT NULL;

CREATE TRIGGER "order_operations_touch_updated_at"
BEFORE UPDATE ON "orders"."order_operations"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_operation_attempts" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "provider_route" varchar(255) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "response_hash" varchar(64),
  "status" "orders"."order_operation_status" NOT NULL,
  "error_code" text,
  "error_message" text,
  "duration_ms" integer,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone,
  CONSTRAINT "order_operation_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_operation_attempts_number_unique" UNIQUE ("store_id", "operation_id", "attempt_number"),
  CONSTRAINT "order_operation_attempts_operation_fk" FOREIGN KEY ("store_id", "operation_id")
    REFERENCES "orders"."order_operations" ("store_id", "id"),
  CONSTRAINT "order_operation_attempts_values_check" CHECK (
    "attempt_number" > 0 AND "request_hash" ~ '^[0-9a-f]{64}$'
    AND ("response_hash" IS NULL OR "response_hash" ~ '^[0-9a-f]{64}$')
    AND ("duration_ms" IS NULL OR "duration_ms" >= 0)
  )
);

CREATE INDEX "order_operation_attempts_operation_idx"
  ON "orders"."order_operation_attempts" ("store_id", "operation_id", "attempt_number");

CREATE TRIGGER "order_operation_attempts_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_operation_attempts"
FOR EACH ROW EXECUTE FUNCTION "orders"."reject_row_mutation"();
