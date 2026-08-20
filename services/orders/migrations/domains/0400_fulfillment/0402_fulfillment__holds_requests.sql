-- Up Migration

CREATE TABLE "orders"."order_fulfillment_holds" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "fulfillment_order_id" uuid NOT NULL,
  "reason_code" varchar(128) NOT NULL,
  "reason" text NOT NULL,
  "system_managed" boolean NOT NULL DEFAULT false,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "released_by_type" "orders"."order_actor_type",
  "released_by_id" uuid,
  "released_at" timestamp with time zone,
  "release_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_fulfillment_holds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_fulfillment_holds_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_holds_fulfillment_order_fk" FOREIGN KEY ("store_id", "order_id", "fulfillment_order_id")
    REFERENCES "orders"."order_fulfillment_orders" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_holds_reason_check" CHECK (btrim("reason_code") <> '' AND btrim("reason") <> ''),
  CONSTRAINT "order_fulfillment_holds_release_check" CHECK (
    ("released_at" IS NULL AND "released_by_type" IS NULL AND "released_by_id" IS NULL)
    OR ("released_at" IS NOT NULL AND "released_by_type" IS NOT NULL AND "release_reason" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "order_fulfillment_holds_active_reason_idx"
  ON "orders"."order_fulfillment_holds" ("store_id", "fulfillment_order_id", "reason_code")
  WHERE "released_at" IS NULL;

CREATE INDEX "order_fulfillment_holds_active_idx"
  ON "orders"."order_fulfillment_holds" ("store_id", "order_id", "fulfillment_order_id", "created_at")
  WHERE "released_at" IS NULL;

CREATE TABLE "orders"."order_fulfillment_service_requests" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "fulfillment_order_id" uuid NOT NULL,
  "app_installation_id" uuid NOT NULL,
  "app_code" varchar(128) NOT NULL,
  "request_revision" integer NOT NULL DEFAULT 1,
  "status" "orders"."order_fulfillment_request_status" NOT NULL DEFAULT 'UNSUBMITTED',
  "provider_reference" text,
  "provider_revision" text,
  "request_snapshot" jsonb NOT NULL,
  "response_snapshot" jsonb,
  "failure_code" text,
  "failure_message" text,
  "submitted_at" timestamp with time zone,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_fulfillment_service_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_fulfillment_service_requests_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_service_requests_revision_unique" UNIQUE ("store_id", "fulfillment_order_id", "request_revision"),
  CONSTRAINT "order_fulfillment_service_requests_fo_fk" FOREIGN KEY ("store_id", "order_id", "fulfillment_order_id")
    REFERENCES "orders"."order_fulfillment_orders" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_service_requests_revision_check" CHECK ("request_revision" > 0),
  CONSTRAINT "order_fulfillment_service_requests_snapshot_check" CHECK (jsonb_typeof("request_snapshot") = 'object')
);

CREATE INDEX "order_fulfillment_service_requests_status_idx"
  ON "orders"."order_fulfillment_service_requests" ("store_id", "status", "updated_at", "id");

CREATE TRIGGER "order_fulfillment_service_requests_touch_updated_at"
BEFORE UPDATE ON "orders"."order_fulfillment_service_requests"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();
