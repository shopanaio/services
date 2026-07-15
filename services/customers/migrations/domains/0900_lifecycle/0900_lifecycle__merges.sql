CREATE TABLE "customers"."customer_merge" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "source_customer_id" uuid NOT NULL,
  "target_customer_id" uuid NOT NULL,
  "status" "customers"."customer_merge_status" NOT NULL DEFAULT 'requested',
  "reason" text,
  "requested_by_type" varchar(32) NOT NULL DEFAULT 'system',
  "requested_by_id" text,
  "idempotency_key" text NOT NULL,
  "resolution" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "error_code" varchar(128),
  "error_message" text,
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_merge_source_customer_fk"
    FOREIGN KEY ("source_customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "customer_merge_target_customer_fk"
    FOREIGN KEY ("target_customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "customer_merge_distinct_customers_check"
    CHECK ("source_customer_id" <> "target_customer_id"),
  CONSTRAINT "customer_merge_started_at_check"
    CHECK ("started_at" IS NULL OR "started_at" >= "requested_at"),
  CONSTRAINT "customer_merge_finished_at_check"
    CHECK (
      "finished_at" IS NULL
      OR "finished_at" >= COALESCE("started_at", "requested_at")
    ),
  CONSTRAINT "customer_merge_terminal_status_check"
    CHECK (
      ("status" IN ('completed', 'failed') AND "finished_at" IS NOT NULL)
      OR
      ("status" NOT IN ('completed', 'failed') AND "finished_at" IS NULL)
    )
);

CREATE UNIQUE INDEX "customer_merge_idempotency_unique"
  ON "customers"."customer_merge" ("store_id", "idempotency_key");

CREATE UNIQUE INDEX "customer_merge_source_active_unique"
  ON "customers"."customer_merge" ("source_customer_id")
  WHERE "status" IN ('requested', 'in_progress');

CREATE INDEX "customer_merge_store_status_idx"
  ON "customers"."customer_merge" ("store_id", "status", "requested_at", "id");

CREATE INDEX "customer_merge_job_target_idx"
  ON "customers"."customer_merge" ("target_customer_id", "requested_at", "id");
