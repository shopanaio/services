CREATE TABLE "customers"."customer_data_request" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "type" "customers"."customer_data_request_type" NOT NULL,
  "status" "customers"."customer_data_request_status" NOT NULL DEFAULT 'PENDING',
  "requested_by_type" varchar(32) NOT NULL,
  "requested_by_id" text,
  "idempotency_key" text NOT NULL,
  "legal_basis" varchar(128),
  "request_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "result_file_id" uuid,
  "rejection_reason" text,
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "due_at" timestamptz,
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_data_request_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "customer_data_request_due_at_check"
    CHECK ("due_at" IS NULL OR "due_at" >= "requested_at"),
  CONSTRAINT "customer_data_request_started_at_check"
    CHECK ("started_at" IS NULL OR "started_at" >= "requested_at"),
  CONSTRAINT "customer_data_request_finished_at_check"
    CHECK (
      "finished_at" IS NULL
      OR "finished_at" >= COALESCE("started_at", "requested_at")
    ),
  CONSTRAINT "customer_data_request_terminal_status_check"
    CHECK (
      ("status" IN ('COMPLETED', 'REJECTED', 'CANCELLED') AND "finished_at" IS NOT NULL)
      OR
      ("status" NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED') AND "finished_at" IS NULL)
    ),
  CONSTRAINT "customer_data_request_rejection_reason_check"
    CHECK ("status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL)
);

CREATE UNIQUE INDEX "customer_data_request_idempotency_unique"
  ON "customers"."customer_data_request" ("store_id", "idempotency_key");

CREATE INDEX "customer_data_request_store_status_idx"
  ON "customers"."customer_data_request" ("store_id", "status", "requested_at", "id");

CREATE INDEX "customer_data_request_customer_idx"
  ON "customers"."customer_data_request" ("customer_id", "requested_at" DESC, "id");

CREATE INDEX "customer_data_request_due_idx"
  ON "customers"."customer_data_request" ("due_at", "id")
  WHERE "status" IN ('PENDING', 'PROCESSING') AND "due_at" IS NOT NULL;
