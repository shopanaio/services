-- Up Migration

CREATE TABLE "orders"."order_shipment_packages" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "shipment_id" uuid NOT NULL,
  "package_reference" text,
  "weight_value" numeric(20, 6),
  "weight_unit" varchar(16),
  "length_value" numeric(20, 6),
  "width_value" numeric(20, 6),
  "height_value" numeric(20, 6),
  "dimensions_unit" varchar(16),
  "declared_value_amount" bigint,
  "currency_code" varchar(3) NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_shipment_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_shipment_packages_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipment_packages_shipment_fk" FOREIGN KEY ("store_id", "order_id", "shipment_id")
    REFERENCES "orders"."order_shipments" ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipment_packages_order_currency_fk" FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_shipment_packages_weight_check" CHECK (
    ("weight_value" IS NULL AND "weight_unit" IS NULL) OR ("weight_value" > 0 AND "weight_unit" IS NOT NULL)
  ),
  CONSTRAINT "order_shipment_packages_dimensions_check" CHECK (
    ("length_value" IS NULL AND "width_value" IS NULL AND "height_value" IS NULL AND "dimensions_unit" IS NULL)
    OR ("length_value" > 0 AND "width_value" > 0 AND "height_value" > 0 AND "dimensions_unit" IS NOT NULL)
  ),
  CONSTRAINT "order_shipment_packages_declared_value_check" CHECK ("declared_value_amount" IS NULL OR "declared_value_amount" >= 0)
);

CREATE INDEX "order_shipment_packages_shipment_idx"
  ON "orders"."order_shipment_packages" ("store_id", "order_id", "shipment_id", "id");

CREATE TABLE "orders"."order_shipment_package_lines" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "order_shipment_package_lines_pkey" PRIMARY KEY ("store_id", "order_id", "package_id", "order_line_id"),
  CONSTRAINT "order_shipment_package_lines_package_fk" FOREIGN KEY ("store_id", "order_id", "package_id")
    REFERENCES "orders"."order_shipment_packages" ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipment_package_lines_fulfillment_line_fk" FOREIGN KEY ("store_id", "order_id", "fulfillment_id", "order_line_id")
    REFERENCES "orders"."order_fulfillment_lines" ("store_id", "order_id", "fulfillment_id", "order_line_id"),
  CONSTRAINT "order_shipment_package_lines_quantity_check" CHECK ("quantity" > 0)
);

CREATE INDEX "order_shipment_package_lines_line_idx"
  ON "orders"."order_shipment_package_lines" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_shipment_provider_operations" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "shipment_id" uuid NOT NULL,
  "operation" varchar(64) NOT NULL,
  "status" "orders"."order_operation_status" NOT NULL DEFAULT 'PENDING',
  "app_installation_id" uuid NOT NULL,
  "provider_code" varchar(128) NOT NULL,
  "provider_route" varchar(255) NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "provider_reference" text,
  "response" jsonb,
  "failure_code" text,
  "failure_message" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "available_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_shipment_provider_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_shipment_provider_operations_idempotency_unique" UNIQUE ("store_id", "provider_route", "idempotency_key"),
  CONSTRAINT "order_shipment_provider_operations_shipment_fk" FOREIGN KEY ("store_id", "order_id", "shipment_id")
    REFERENCES "orders"."order_shipments" ("store_id", "order_id", "id"),
  CONSTRAINT "order_shipment_provider_operations_attempts_check" CHECK ("attempts" >= 0),
  CONSTRAINT "order_shipment_provider_operations_hash_check" CHECK ("request_hash" ~ '^[0-9a-f]{64}$')
);

CREATE INDEX "order_shipment_provider_operations_pending_idx"
  ON "orders"."order_shipment_provider_operations" ("available_at", "id")
  WHERE "status" IN ('PENDING', 'FAILED');

CREATE TRIGGER "order_shipment_provider_operations_touch_updated_at"
BEFORE UPDATE ON "orders"."order_shipment_provider_operations"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_fulfillment_event_inbox" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "provider_code" varchar(128) NOT NULL,
  "provider_resource_id" text NOT NULL,
  "provider_event_id" text NOT NULL,
  "provider_sequence" bigint,
  "event_type" varchar(128) NOT NULL,
  "schema_version" integer NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "status" "orders"."order_inbox_status" NOT NULL DEFAULT 'RECEIVED',
  "payload" jsonb NOT NULL,
  "received_at" timestamp with time zone NOT NULL DEFAULT now(),
  "processed_at" timestamp with time zone,
  "failure_code" text,
  CONSTRAINT "order_fulfillment_event_inbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_fulfillment_event_inbox_event_unique" UNIQUE ("store_id", "provider_code", "provider_event_id"),
  CONSTRAINT "order_fulfillment_event_inbox_sequence_unique" UNIQUE ("store_id", "provider_code", "provider_resource_id", "provider_sequence"),
  CONSTRAINT "order_fulfillment_event_inbox_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_fulfillment_event_inbox_versions_check" CHECK ("schema_version" > 0 AND ("provider_sequence" IS NULL OR "provider_sequence" >= 0)),
  CONSTRAINT "order_fulfillment_event_inbox_hash_check" CHECK ("request_hash" ~ '^[A-Za-z0-9_-]+$'),
  CONSTRAINT "order_fulfillment_event_inbox_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "order_fulfillment_event_inbox_pending_idx"
  ON "orders"."order_fulfillment_event_inbox" ("received_at", "id") WHERE "status" = 'RECEIVED';

CREATE TRIGGER "order_fulfillment_event_inbox_append_only"
BEFORE DELETE ON "orders"."order_fulfillment_event_inbox"
FOR EACH ROW EXECUTE FUNCTION "orders"."reject_row_mutation"();
