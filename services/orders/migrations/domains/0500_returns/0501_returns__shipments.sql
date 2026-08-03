-- Up Migration

CREATE TABLE "orders"."order_return_shipments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "return_request_id" uuid NOT NULL,
  "status" "orders"."order_shipment_status" NOT NULL DEFAULT 'LABEL_CREATED',
  "carrier_code" text,
  "carrier_name" text,
  "service_code" text,
  "tracking_number" text,
  "tracking_url" text,
  "external_id" text,
  "destination_location_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "shipped_at" timestamp with time zone,
  "received_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_return_shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_return_shipments_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_return_shipments_request_fk"
    FOREIGN KEY ("store_id", "order_id", "return_request_id")
    REFERENCES "orders"."order_return_requests" ("store_id", "order_id", "id"),
  CONSTRAINT "order_return_shipments_timestamps_check" CHECK (
    ("shipped_at" IS NULL OR "shipped_at" >= "created_at")
    AND ("received_at" IS NULL OR "received_at" >= COALESCE("shipped_at", "created_at"))
  )
);

CREATE UNIQUE INDEX "order_return_shipments_external_key"
  ON "orders"."order_return_shipments" ("store_id", "carrier_code", "external_id")
  WHERE "external_id" IS NOT NULL;

CREATE INDEX "order_return_shipments_request_idx"
  ON "orders"."order_return_shipments" (
    "store_id", "order_id", "return_request_id", "created_at", "id"
  );

CREATE INDEX "order_return_shipments_tracking_idx"
  ON "orders"."order_return_shipments" ("store_id", "tracking_number")
  WHERE "tracking_number" IS NOT NULL;

CREATE TRIGGER "order_return_shipments_touch_updated_at"
BEFORE UPDATE ON "orders"."order_return_shipments"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_return_tracking_events" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "return_shipment_id" uuid NOT NULL,
  "status" "orders"."order_shipment_status" NOT NULL,
  "provider_event_id" text,
  "message" text,
  "location" text,
  "raw_payload" jsonb,
  "happened_at" timestamp with time zone NOT NULL,
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_return_tracking_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_return_tracking_events_sequence_unique" UNIQUE ("sequence"),
  CONSTRAINT "order_return_tracking_events_shipment_fk"
    FOREIGN KEY ("store_id", "order_id", "return_shipment_id")
    REFERENCES "orders"."order_return_shipments" ("store_id", "order_id", "id")
);

CREATE UNIQUE INDEX "order_return_tracking_events_provider_key"
  ON "orders"."order_return_tracking_events" (
    "store_id", "return_shipment_id", "provider_event_id"
  )
  WHERE "provider_event_id" IS NOT NULL;

CREATE INDEX "order_return_tracking_events_timeline_idx"
  ON "orders"."order_return_tracking_events" (
    "store_id", "order_id", "return_shipment_id", "happened_at", "sequence"
  );

CREATE TRIGGER "order_return_tracking_events_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_return_tracking_events"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();
