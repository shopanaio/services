CREATE TABLE "customers"."customer_segment" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "color" varchar(7),
  "type" "customers"."customer_segment_type" NOT NULL,
  "status" "customers"."customer_segment_status" NOT NULL DEFAULT 'DRAFT',
  "query" text,
  "definition" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_id" text,
  "revision" integer NOT NULL DEFAULT 1,
  "definition_revision" integer NOT NULL DEFAULT 1,
  "evaluation_generation" integer NOT NULL DEFAULT 0,
  "materialization_status" "customers"."customer_segment_materialization_status",
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_segment_name_check"
    CHECK (length(btrim("name")) > 0),
  CONSTRAINT "customer_segment_dynamic_definition_check"
    CHECK (
      ("type" = 'DYNAMIC'
        AND length(btrim("query")) > 0
        AND "definition" <> '{}'::jsonb
        AND "definition" ->> 'version' = '1')
      OR
      ("type" = 'MANUAL' AND "query" IS NULL AND "definition" = '{}'::jsonb)
    ),
  CONSTRAINT "customer_segment_color_check"
    CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "customer_segment_revision_nonnegative_check"
    CHECK ("revision" >= 1),
  CONSTRAINT "customer_segment_definition_revision_nonnegative_check"
    CHECK ("definition_revision" >= 1),
  CONSTRAINT "customer_segment_evaluation_generation_nonnegative_check"
    CHECK ("evaluation_generation" >= 0),
  CONSTRAINT "customer_segment_materialization_type_check"
    CHECK (
      ("type" = 'DYNAMIC' AND "materialization_status" IS NOT NULL)
      OR
      ("type" = 'MANUAL' AND "materialization_status" IS NULL AND "evaluation_generation" = 0)
    )
);

CREATE UNIQUE INDEX "customer_segment_store_name_unique"
  ON "customers"."customer_segment" ("store_id", lower("name"))
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_segment_store_status_idx"
  ON "customers"."customer_segment" ("store_id", "status", "type", "id")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_segment_store_id_unique"
  ON "customers"."customer_segment" ("store_id", "id");

CREATE TABLE "customers"."customer_segment_membership" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL,
  "source" "customers"."assignment_source" NOT NULL,
  "evaluated_at" timestamptz NOT NULL DEFAULT now(),
  "evaluated_definition_revision" integer,
  "evaluated_generation" integer,
  "expires_at" timestamptz,

  CONSTRAINT "customer_segment_membership_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_membership_segment_fk"
    FOREIGN KEY ("segment_id")
    REFERENCES "customers"."customer_segment" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_membership_store_customer_fk"
    FOREIGN KEY ("store_id", "customer_id")
    REFERENCES "customers"."customer" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_membership_store_segment_fk"
    FOREIGN KEY ("store_id", "segment_id")
    REFERENCES "customers"."customer_segment" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_membership_customer_segment_unique"
    UNIQUE ("customer_id", "segment_id"),
  CONSTRAINT "customer_segment_membership_definition_revision_check"
    CHECK (
      ("source" = 'RULE'
        AND "evaluated_definition_revision" IS NOT NULL
        AND "evaluated_generation" IS NOT NULL)
      OR
      ("source" <> 'RULE'
        AND "evaluated_definition_revision" IS NULL
        AND "evaluated_generation" IS NULL)
    ),
  CONSTRAINT "customer_segment_membership_definition_revision_nonnegative_check"
    CHECK (
      "evaluated_definition_revision" IS NULL
      OR "evaluated_definition_revision" >= 0
    ),
  CONSTRAINT "customer_segment_membership_generation_nonnegative_check"
    CHECK ("evaluated_generation" IS NULL OR "evaluated_generation" >= 0)
);

CREATE INDEX "customer_segment_membership_store_segment_idx"
  ON "customers"."customer_segment_membership" ("store_id", "segment_id", "customer_id");

CREATE INDEX "customer_segment_membership_customer_idx"
  ON "customers"."customer_segment_membership" ("customer_id");

CREATE INDEX "customer_segment_membership_expiry_idx"
  ON "customers"."customer_segment_membership" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

CREATE INDEX "customer_segment_membership_store_customer_expiry_idx"
  ON "customers"."customer_segment_membership"
  ("store_id", "customer_id", "expires_at", "segment_id");

CREATE SEQUENCE "customers"."customer_segment_evaluation_cause_sequence" AS bigint;

CREATE TABLE "customers"."customer_segment_store_context" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL UNIQUE,
  "currency_code" varchar(3) NOT NULL,
  "currency_exponent" integer NOT NULL,
  "time_zone" varchar(64) NOT NULL,
  "configuration_revision" integer NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "customer_segment_store_context_currency_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "customer_segment_store_context_exponent_check"
    CHECK ("currency_exponent" BETWEEN 0 AND 6),
  CONSTRAINT "customer_segment_store_context_revision_check"
    CHECK ("configuration_revision" >= 0)
);

CREATE TABLE "customers"."customer_segment_materialization_run" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL REFERENCES "customers"."customer_segment" ("id") ON DELETE CASCADE,
  "definition_revision" integer NOT NULL,
  "evaluation_generation" integer NOT NULL,
  "status" "customers"."customer_segment_materialization_run_status" NOT NULL DEFAULT 'PENDING',
  "cause_sequence" bigint NOT NULL,
  "scan_effective_at" timestamptz NOT NULL,
  "scan_cursor" text,
  "scan_completed_at" timestamptz,
  "queue_watermark" bigint,
  "publication_effective_at" timestamptz,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "lease_until" timestamptz,
  "claimed_by" text,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "customer_segment_materialization_run_generation_unique"
    UNIQUE ("store_id", "segment_id", "evaluation_generation"),
  CONSTRAINT "customer_segment_materialization_run_store_segment_fk"
    FOREIGN KEY ("store_id", "segment_id")
    REFERENCES "customers"."customer_segment" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_materialization_run_revision_check"
    CHECK ("definition_revision" >= 0 AND "evaluation_generation" >= 0)
);

CREATE INDEX "customer_segment_materialization_run_claim_idx"
  ON "customers"."customer_segment_materialization_run" ("store_id", "status", "lease_until", "created_at");

CREATE TABLE "customers"."customer_segment_evaluation_state" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL REFERENCES "customers"."customer_segment" ("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  "definition_revision" integer NOT NULL,
  "evaluation_generation" integer NOT NULL,
  "evaluated_at" timestamptz NOT NULL,
  "matched" boolean NOT NULL,
  "cause_sequence" bigint NOT NULL,
  "evaluator_token" text NOT NULL,
  "source_event_id" text,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "customer_segment_evaluation_state_pair_unique"
    UNIQUE ("store_id", "segment_id", "customer_id"),
  CONSTRAINT "customer_segment_evaluation_state_store_segment_fk"
    FOREIGN KEY ("store_id", "segment_id")
    REFERENCES "customers"."customer_segment" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_evaluation_state_store_customer_fk"
    FOREIGN KEY ("store_id", "customer_id")
    REFERENCES "customers"."customer" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_evaluation_state_revision_check"
    CHECK ("definition_revision" >= 0 AND "evaluation_generation" >= 0)
);

CREATE INDEX "customer_segment_evaluation_state_customer_idx"
  ON "customers"."customer_segment_evaluation_state" ("store_id", "customer_id");
CREATE INDEX "customer_segment_evaluation_state_generation_idx"
  ON "customers"."customer_segment_evaluation_state" ("store_id", "segment_id", "evaluation_generation");

CREATE TABLE "customers"."customer_segment_evaluation_lock" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  "segment_id" uuid NOT NULL REFERENCES "customers"."customer_segment" ("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "customer_segment_evaluation_lock_pair_unique"
    UNIQUE ("store_id", "customer_id", "segment_id"),
  CONSTRAINT "customer_segment_evaluation_lock_store_customer_fk"
    FOREIGN KEY ("store_id", "customer_id")
    REFERENCES "customers"."customer" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_evaluation_lock_store_segment_fk"
    FOREIGN KEY ("store_id", "segment_id")
    REFERENCES "customers"."customer_segment" ("store_id", "id")
    ON DELETE CASCADE
);

CREATE TABLE "customers"."customer_segment_temporal_schedule" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL REFERENCES "customers"."customer_segment" ("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  "definition_revision" integer NOT NULL,
  "evaluation_generation" integer NOT NULL,
  "evaluate_at" timestamptz NOT NULL,
  "schedule_token" varchar(64) NOT NULL UNIQUE,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "lease_until" timestamptz,
  "claimed_by" text,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "customer_segment_temporal_schedule_pair_unique"
    UNIQUE ("store_id", "segment_id", "customer_id"),
  CONSTRAINT "customer_segment_temporal_schedule_store_segment_fk"
    FOREIGN KEY ("store_id", "segment_id")
    REFERENCES "customers"."customer_segment" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_temporal_schedule_store_customer_fk"
    FOREIGN KEY ("store_id", "customer_id")
    REFERENCES "customers"."customer" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_temporal_schedule_revision_check"
    CHECK ("definition_revision" >= 0 AND "evaluation_generation" >= 0)
);

CREATE INDEX "customer_segment_temporal_schedule_claim_idx"
  ON "customers"."customer_segment_temporal_schedule" ("store_id", "evaluate_at", "lease_until");
CREATE INDEX "customer_segment_temporal_schedule_customer_idx"
  ON "customers"."customer_segment_temporal_schedule" ("store_id", "customer_id");
CREATE INDEX "customer_segment_temporal_schedule_generation_idx"
  ON "customers"."customer_segment_temporal_schedule" ("store_id", "segment_id", "evaluation_generation");

CREATE TABLE "customers"."customer_segment_reevaluation_queue" (
  "sequence" bigint PRIMARY KEY DEFAULT nextval('customers.customer_segment_evaluation_cause_sequence'),
  "store_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL REFERENCES "customers"."customer_segment" ("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  "definition_revision" integer NOT NULL,
  "evaluation_generation" integer NOT NULL,
  "source_event_id" text NOT NULL,
  "requested_effective_at" timestamptz NOT NULL,
  "available_at" timestamptz NOT NULL,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "lease_until" timestamptz,
  "claimed_by" text,
  "completed_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "customer_segment_reevaluation_queue_event_unique"
    UNIQUE (
      "store_id", "segment_id", "customer_id", "definition_revision",
      "evaluation_generation", "source_event_id"
    ),
  CONSTRAINT "customer_segment_reevaluation_queue_store_segment_fk"
    FOREIGN KEY ("store_id", "segment_id")
    REFERENCES "customers"."customer_segment" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_reevaluation_queue_store_customer_fk"
    FOREIGN KEY ("store_id", "customer_id")
    REFERENCES "customers"."customer" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_reevaluation_queue_revision_check"
    CHECK ("definition_revision" >= 0 AND "evaluation_generation" >= 0)
);

CREATE INDEX "customer_segment_reevaluation_queue_claim_idx"
  ON "customers"."customer_segment_reevaluation_queue" (
    "store_id", "definition_revision", "evaluation_generation", "completed_at",
    "available_at", "lease_until", "sequence"
  );
CREATE INDEX "customer_segment_reevaluation_queue_cleanup_idx"
  ON "customers"."customer_segment_reevaluation_queue"
  ("store_id", "completed_at", "sequence");
CREATE INDEX "customer_segment_reevaluation_queue_customer_idx"
  ON "customers"."customer_segment_reevaluation_queue" ("store_id", "customer_id");
CREATE INDEX "customer_segment_reevaluation_queue_generation_idx"
  ON "customers"."customer_segment_reevaluation_queue" ("store_id", "segment_id", "evaluation_generation");
