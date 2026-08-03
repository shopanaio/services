-- Up Migration

CREATE TABLE "orders"."order_revisions" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "status" "orders"."order_status" NOT NULL,
  "payment_status" "orders"."order_payment_status" NOT NULL,
  "fulfillment_status" "orders"."order_fulfillment_status" NOT NULL,
  "delivery_status" "orders"."order_delivery_status" NOT NULL,
  "return_status" "orders"."order_return_status" NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "subtotal_amount" bigint NOT NULL,
  "discount_amount" bigint NOT NULL,
  "shipping_amount" bigint NOT NULL,
  "tax_amount" bigint NOT NULL,
  "duty_amount" bigint NOT NULL,
  "adjustment_amount" bigint NOT NULL,
  "total_amount" bigint NOT NULL,
  "snapshot" jsonb NOT NULL,
  "reason" text NOT NULL,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_revisions_pkey" PRIMARY KEY ("store_id", "order_id", "revision"),
  CONSTRAINT "order_revisions_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_revisions_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "order_revisions_snapshot_check" CHECK (jsonb_typeof("snapshot") = 'object'),
  CONSTRAINT "order_revisions_amounts_check" CHECK (
    "subtotal_amount" >= 0
    AND "discount_amount" >= 0
    AND "shipping_amount" >= 0
    AND "tax_amount" >= 0
    AND "duty_amount" >= 0
    AND "total_amount" >= 0
  ),
  CONSTRAINT "order_revisions_total_formula_check" CHECK (
    "total_amount" =
      "subtotal_amount"
      - "discount_amount"
      + "shipping_amount"
      + "tax_amount"
      + "duty_amount"
      + "adjustment_amount"
  ),
  CONSTRAINT "order_revisions_actor_check" CHECK (
    "created_by_type" = 'SYSTEM' OR "created_by_id" IS NOT NULL
  )
);

CREATE INDEX "order_revisions_order_created_idx"
  ON "orders"."order_revisions" ("store_id", "order_id", "created_at" DESC, "revision" DESC);

CREATE TRIGGER "order_revisions_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_revisions"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();

CREATE TABLE "orders"."order_status_history" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_revision" integer NOT NULL,
  "order_status" "orders"."order_status" NOT NULL,
  "payment_status" "orders"."order_payment_status" NOT NULL,
  "fulfillment_status" "orders"."order_fulfillment_status" NOT NULL,
  "delivery_status" "orders"."order_delivery_status" NOT NULL,
  "return_status" "orders"."order_return_status" NOT NULL,
  "reason_code" text,
  "note" text,
  "actor_type" "orders"."order_actor_type" NOT NULL,
  "actor_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "happened_at" timestamp with time zone NOT NULL DEFAULT now(),
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_status_history_sequence_unique" UNIQUE ("sequence"),
  CONSTRAINT "order_status_history_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_status_history_revision_fk"
    FOREIGN KEY ("store_id", "order_id", "order_revision")
    REFERENCES "orders"."order_revisions" ("store_id", "order_id", "revision"),
  CONSTRAINT "order_status_history_revision_unique"
    UNIQUE ("store_id", "order_id", "order_revision"),
  CONSTRAINT "order_status_history_actor_check" CHECK (
    "actor_type" = 'SYSTEM' OR "actor_id" IS NOT NULL
  )
);

CREATE INDEX "order_status_history_timeline_idx"
  ON "orders"."order_status_history" (
    "store_id", "order_id", "happened_at", "sequence"
  );

CREATE TRIGGER "order_status_history_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_status_history"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();

CREATE TABLE "orders"."order_events" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "event_type" varchar(128) NOT NULL,
  "event_version" integer NOT NULL DEFAULT 1,
  "aggregate_revision" integer NOT NULL,
  "visibility" "orders"."order_event_visibility" NOT NULL DEFAULT 'INTERNAL',
  "actor_type" "orders"."order_actor_type" NOT NULL,
  "actor_id" uuid,
  "correlation_id" uuid,
  "causation_id" uuid,
  "idempotency_key" text,
  "payload" jsonb NOT NULL,
  "happened_at" timestamp with time zone NOT NULL DEFAULT now(),
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_events_sequence_unique" UNIQUE ("sequence"),
  CONSTRAINT "order_events_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_events_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_events_revision_fk"
    FOREIGN KEY ("store_id", "order_id", "aggregate_revision")
    REFERENCES "orders"."order_revisions" ("store_id", "order_id", "revision"),
  CONSTRAINT "order_events_event_type_check" CHECK (btrim("event_type") <> ''),
  CONSTRAINT "order_events_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "order_events_versions_check" CHECK (
    "event_version" > 0 AND "aggregate_revision" > 0
  ),
  CONSTRAINT "order_events_actor_check" CHECK (
    "actor_type" = 'SYSTEM' OR "actor_id" IS NOT NULL
  )
);

CREATE UNIQUE INDEX "order_events_idempotency_key"
  ON "orders"."order_events" ("store_id", "order_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX "order_events_timeline_idx"
  ON "orders"."order_events" (
    "store_id", "order_id", "happened_at", "sequence"
  );

CREATE INDEX "order_events_store_type_recorded_idx"
  ON "orders"."order_events" ("store_id", "event_type", "recorded_at", "sequence");

CREATE INDEX "order_events_correlation_idx"
  ON "orders"."order_events" ("correlation_id")
  WHERE "correlation_id" IS NOT NULL;

CREATE TRIGGER "order_events_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_events"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();
