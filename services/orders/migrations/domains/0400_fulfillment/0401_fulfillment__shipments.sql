-- Up Migration

CREATE TABLE "orders"."order_shipments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "status" "orders"."order_shipment_status" NOT NULL DEFAULT 'DRAFT',
  "carrier_code" text,
  "carrier_name" text,
  "service_code" text,
  "external_id" text,
  "label_url" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "shipped_at" timestamp with time zone,
  "estimated_delivery_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_shipments_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipments_fulfillment_fk"
    FOREIGN KEY ("store_id", "order_id", "fulfillment_id")
    REFERENCES "orders"."order_fulfillments" ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipments_timestamps_check" CHECK (
    ("shipped_at" IS NULL OR "shipped_at" >= "created_at")
    AND (
      "estimated_delivery_at" IS NULL
      OR "estimated_delivery_at" >= COALESCE("shipped_at", "created_at")
    )
    AND (
      "delivered_at" IS NULL
      OR "delivered_at" >= COALESCE("shipped_at", "created_at")
    )
  )
);

CREATE UNIQUE INDEX "order_shipments_external_key"
  ON "orders"."order_shipments" ("store_id", "carrier_code", "external_id")
  WHERE "external_id" IS NOT NULL;

CREATE INDEX "order_shipments_store_order_idx"
  ON "orders"."order_shipments" ("store_id", "order_id", "created_at", "id");

CREATE INDEX "order_shipments_fulfillment_idx"
  ON "orders"."order_shipments" ("store_id", "order_id", "fulfillment_id", "id");

CREATE INDEX "order_shipments_store_status_idx"
  ON "orders"."order_shipments" ("store_id", "status", "updated_at" DESC);

CREATE TRIGGER "order_shipments_touch_updated_at"
BEFORE UPDATE ON "orders"."order_shipments"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_shipment_tracking_numbers" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "shipment_id" uuid NOT NULL,
  "number" text NOT NULL,
  "url" text,
  "company" text,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_shipment_tracking_numbers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_shipment_tracking_numbers_shipment_fk"
    FOREIGN KEY ("store_id", "order_id", "shipment_id")
    REFERENCES "orders"."order_shipments" ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipment_tracking_numbers_number_check" CHECK (btrim("number") <> ''),
  CONSTRAINT "order_shipment_tracking_numbers_business_key"
    UNIQUE ("store_id", "order_id", "shipment_id", "number")
);

CREATE UNIQUE INDEX "order_shipment_tracking_numbers_primary_idx"
  ON "orders"."order_shipment_tracking_numbers" ("store_id", "order_id", "shipment_id")
  WHERE "is_primary" = true;

CREATE INDEX "order_shipment_tracking_numbers_lookup_idx"
  ON "orders"."order_shipment_tracking_numbers" ("store_id", "number");

CREATE TABLE "orders"."order_shipment_tracking_events" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "shipment_id" uuid NOT NULL,
  "status" "orders"."order_shipment_status" NOT NULL,
  "provider_event_id" text,
  "message" text,
  "location" text,
  "raw_payload" jsonb,
  "happened_at" timestamp with time zone NOT NULL,
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_shipment_tracking_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_shipment_tracking_events_sequence_unique" UNIQUE ("sequence"),
  CONSTRAINT "order_shipment_tracking_events_shipment_fk"
    FOREIGN KEY ("store_id", "order_id", "shipment_id")
    REFERENCES "orders"."order_shipments" ("store_id", "order_id", "id")
);

CREATE UNIQUE INDEX "order_shipment_tracking_events_provider_key"
  ON "orders"."order_shipment_tracking_events" (
    "store_id", "shipment_id", "provider_event_id"
  )
  WHERE "provider_event_id" IS NOT NULL;

CREATE INDEX "order_shipment_tracking_events_timeline_idx"
  ON "orders"."order_shipment_tracking_events" (
    "store_id", "order_id", "shipment_id", "happened_at", "sequence"
  );

CREATE TRIGGER "order_shipment_tracking_events_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_shipment_tracking_events"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();
