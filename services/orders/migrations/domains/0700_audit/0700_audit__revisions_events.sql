-- Up Migration

CREATE TABLE "orders"."order_status_history" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
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
  "event_id" uuid NOT NULL DEFAULT uuidv7(),
  "global_position" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "event_type" varchar(128) NOT NULL,
  "schema_version" integer NOT NULL DEFAULT 1,
  "visibility" "orders"."order_event_visibility" NOT NULL DEFAULT 'INTERNAL',
  "actor_type" "orders"."order_actor_type" NOT NULL,
  "actor_id" uuid,
  "correlation_id" uuid,
  "causation_id" uuid,
  "idempotency_key" text,
  "payload" jsonb NOT NULL,
  "happened_at" timestamp with time zone NOT NULL DEFAULT now(),
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("event_id"),
  CONSTRAINT "order_events_global_position_unique" UNIQUE ("global_position"),
  CONSTRAINT "order_events_store_order_event_id_unique"
    UNIQUE ("store_id", "order_id", "event_id"),
  CONSTRAINT "order_events_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_events_event_type_check" CHECK (btrim("event_type") <> ''),
  CONSTRAINT "order_events_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "order_events_schema_version_check" CHECK ("schema_version" > 0),
  CONSTRAINT "order_events_actor_check" CHECK (
    "actor_type" = 'SYSTEM' OR "actor_id" IS NOT NULL
  )
);

CREATE UNIQUE INDEX "order_events_idempotency_key"
  ON "orders"."order_events" ("store_id", "order_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX "order_events_timeline_idx"
  ON "orders"."order_events" (
    "store_id", "order_id", "happened_at", "global_position"
  );

CREATE INDEX "order_events_store_type_recorded_idx"
  ON "orders"."order_events" ("store_id", "event_type", "recorded_at", "global_position");

CREATE INDEX "order_events_correlation_idx"
  ON "orders"."order_events" ("correlation_id")
  WHERE "correlation_id" IS NOT NULL;

CREATE TRIGGER "order_events_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_events"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();
