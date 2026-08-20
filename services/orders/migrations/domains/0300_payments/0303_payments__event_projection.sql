-- Up Migration
CREATE TABLE "orders"."order_payment_event_inbox" (
  "event_id" text PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "payment_collection_id" uuid NOT NULL,
  "event_type" varchar(128) NOT NULL,
  "schema_version" integer NOT NULL DEFAULT 1,
  "event_sequence" bigint NOT NULL,
  "status" "orders"."order_inbox_status" NOT NULL DEFAULT 'RECEIVED',
  "payload" jsonb NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz,
  "failure_code" text,
  CONSTRAINT "order_payment_event_inbox_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "order_payment_event_inbox_sequence_unique" UNIQUE ("store_id", "payment_collection_id", "event_sequence"),
  CONSTRAINT "order_payment_event_inbox_type_check" CHECK (btrim("event_type") <> ''),
  CONSTRAINT "order_payment_event_inbox_versions_check" CHECK ("schema_version" > 0 AND "event_sequence" >= 0),
  CONSTRAINT "order_payment_event_inbox_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "order_payment_event_inbox_order_idx"
  ON "orders"."order_payment_event_inbox"
  ("store_id", "order_id", "occurred_at", "event_id");

CREATE INDEX "order_payment_event_inbox_collection_idx"
  ON "orders"."order_payment_event_inbox"
  ("store_id", "payment_collection_id", "occurred_at");

CREATE INDEX "order_payment_event_inbox_pending_idx"
  ON "orders"."order_payment_event_inbox" ("received_at", "event_id")
  WHERE "status" = 'RECEIVED';

CREATE TRIGGER "order_payment_event_inbox_prevent_delete"
BEFORE DELETE ON "orders"."order_payment_event_inbox"
FOR EACH ROW EXECUTE FUNCTION "orders"."reject_row_mutation"();

CREATE TABLE "orders"."order_payment_projection" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "payment_collection_id" uuid NOT NULL,
  "payment_status" "orders"."order_payment_status" NOT NULL,
  "last_event_sequence" bigint NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "order_payment_projection_pkey" PRIMARY KEY ("store_id", "order_id"),
  CONSTRAINT "order_payment_projection_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "order_payment_projection_collection_unique"
    UNIQUE ("store_id", "payment_collection_id"),
  CONSTRAINT "order_payment_projection_sequence_check" CHECK ("last_event_sequence" > 0)
);
