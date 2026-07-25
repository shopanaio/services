-- Up Migration

CREATE TABLE "apps"."app_sales_channel_operations" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "connection_id" uuid NOT NULL,
  "type" "apps"."app_sales_channel_operation_type" NOT NULL,
  "status" "apps"."app_sales_channel_operation_status" DEFAULT 'PENDING' NOT NULL,
  "target_specification_id" uuid,
  "idempotency_key" varchar(255) NOT NULL,
  "workflow_id" varchar(255) NOT NULL,
  "actor_type" varchar(16) NOT NULL,
  "actor_id" varchar(255),
  "correlation_id" varchar(255),
  "previous_connection_status" "apps"."app_sales_channel_connection_status",
  "error_code" varchar(128),
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_sales_channel_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_sales_channel_operation_idempotency_key"
    UNIQUE ("connection_id", "idempotency_key"),
  CONSTRAINT "app_sales_channel_operations_connection_id_app_sales_channel_connections_id_fk"
    FOREIGN KEY ("connection_id")
    REFERENCES "apps"."app_sales_channel_connections" ("id")
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT "app_sales_channel_operations_target_specification_id_app_sales_channel_specification_snapshots_id_fk"
    FOREIGN KEY ("target_specification_id")
    REFERENCES "apps"."app_sales_channel_specification_snapshots" ("id")
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

CREATE INDEX "app_sales_channel_operations_connection_idx"
  ON "apps"."app_sales_channel_operations" ("connection_id", "created_at");

CREATE INDEX "app_sales_channel_operations_status_idx"
  ON "apps"."app_sales_channel_operations" ("status", "created_at");
