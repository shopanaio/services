-- Up Migration

CREATE TABLE "apps"."app_lifecycle_operations" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "type" "apps"."app_lifecycle_operation_type" NOT NULL,
  "status" "apps"."app_lifecycle_operation_status" DEFAULT 'PENDING' NOT NULL,
  "target_version" varchar(64) NOT NULL,
  "previous_installation_status" "apps"."app_installation_status",
  "idempotency_key" varchar(255) NOT NULL,
  "workflow_id" varchar(255) NOT NULL,
  "actor_type" varchar(16) NOT NULL,
  "actor_id" varchar(255),
  "correlation_id" varchar(255),
  "error_code" varchar(128),
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_lifecycle_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_lifecycle_operation_idempotency_key"
    UNIQUE ("installation_id", "idempotency_key"),
  CONSTRAINT "app_lifecycle_operations_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE INDEX "app_lifecycle_operations_installation_idx"
  ON "apps"."app_lifecycle_operations" ("installation_id", "created_at");

CREATE INDEX "app_lifecycle_operations_status_idx"
  ON "apps"."app_lifecycle_operations" ("status");
