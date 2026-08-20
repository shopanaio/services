-- Up Migration

CREATE TABLE "orders"."order_external_references" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "app_installation_id" uuid NOT NULL,
  "system_code" varchar(128) NOT NULL,
  "external_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_external_references_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_external_references_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_external_references_external_unique" UNIQUE ("store_id", "app_installation_id", "system_code", "external_id"),
  CONSTRAINT "order_external_references_order_system_unique" UNIQUE ("store_id", "order_id", "app_installation_id", "system_code"),
  CONSTRAINT "order_external_references_values_check" CHECK (btrim("system_code") <> '' AND btrim("external_id") <> '')
);

CREATE INDEX "order_external_references_order_idx"
  ON "orders"."order_external_references" ("store_id", "order_id", "id");

CREATE TABLE "orders"."order_integration_links" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "kind" "orders"."order_integration_kind" NOT NULL,
  "app_code" varchar(128) NOT NULL,
  "app_installation_id" uuid NOT NULL,
  "direction" "orders"."order_sync_direction" NOT NULL,
  "status" "orders"."order_integration_sync_status" NOT NULL DEFAULT 'NEVER_SYNCED',
  "external_id" text,
  "external_url" text,
  "last_exported_order_version" integer,
  "last_imported_external_version" text,
  "last_synced_at" timestamp with time zone,
  "last_error_code" text,
  "last_error_message" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_integration_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_integration_links_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_integration_links_route_unique" UNIQUE ("store_id", "order_id", "app_installation_id", "kind"),
  CONSTRAINT "order_integration_links_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_integration_links_version_check" CHECK ("last_exported_order_version" IS NULL OR "last_exported_order_version" > 0),
  CONSTRAINT "order_integration_links_failure_check" CHECK ("status" <> 'FAILED' OR "last_error_code" IS NOT NULL)
);

CREATE INDEX "order_integration_links_status_idx"
  ON "orders"."order_integration_links" ("store_id", "status", "updated_at", "id");

CREATE TRIGGER "order_integration_links_touch_updated_at"
BEFORE UPDATE ON "orders"."order_integration_links"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_integration_sync_attempts" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "integration_link_id" uuid NOT NULL,
  "direction" "orders"."order_sync_direction" NOT NULL,
  "status" "orders"."order_operation_status" NOT NULL DEFAULT 'PENDING',
  "attempt_number" integer NOT NULL,
  "exported_order_version" integer,
  "external_revision" text,
  "idempotency_key" text NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "response_hash" varchar(64),
  "failure_code" text,
  "failure_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_integration_sync_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_integration_sync_attempts_link_attempt_unique" UNIQUE ("store_id", "integration_link_id", "attempt_number"),
  CONSTRAINT "order_integration_sync_attempts_idempotency_unique" UNIQUE ("store_id", "integration_link_id", "idempotency_key"),
  CONSTRAINT "order_integration_sync_attempts_link_fk" FOREIGN KEY ("store_id", "order_id", "integration_link_id")
    REFERENCES "orders"."order_integration_links" ("store_id", "order_id", "id"),
  CONSTRAINT "order_integration_sync_attempts_values_check" CHECK (
    "attempt_number" > 0 AND ("exported_order_version" IS NULL OR "exported_order_version" > 0)
    AND "request_hash" ~ '^[0-9a-f]{64}$'
    AND ("response_hash" IS NULL OR "response_hash" ~ '^[0-9a-f]{64}$')
  )
);

CREATE INDEX "order_integration_sync_attempts_pending_idx"
  ON "orders"."order_integration_sync_attempts" ("created_at", "id") WHERE "status" IN ('PENDING', 'RUNNING');

CREATE TABLE "orders"."order_integration_event_inbox" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid,
  "app_installation_id" uuid NOT NULL,
  "provider_event_id" text NOT NULL,
  "external_order_id" text NOT NULL,
  "external_revision" text,
  "event_type" varchar(128) NOT NULL,
  "schema_version" integer NOT NULL,
  "status" "orders"."order_inbox_status" NOT NULL DEFAULT 'RECEIVED',
  "payload" jsonb NOT NULL,
  "received_at" timestamp with time zone NOT NULL DEFAULT now(),
  "processed_at" timestamp with time zone,
  "failure_code" text,
  CONSTRAINT "order_integration_event_inbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_integration_event_inbox_event_unique" UNIQUE ("store_id", "app_installation_id", "provider_event_id"),
  CONSTRAINT "order_integration_event_inbox_revision_unique" UNIQUE ("store_id", "app_installation_id", "external_order_id", "external_revision"),
  CONSTRAINT "order_integration_event_inbox_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_integration_event_inbox_version_check" CHECK ("schema_version" > 0),
  CONSTRAINT "order_integration_event_inbox_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "order_integration_event_inbox_pending_idx"
  ON "orders"."order_integration_event_inbox" ("received_at", "id") WHERE "status" = 'RECEIVED';
