CREATE TYPE "platform"."app_installation_health_status" AS ENUM('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY');--> statement-breakpoint
CREATE TYPE "platform"."app_installation_status" AS ENUM('PENDING_CONSENT', 'INSTALLING', 'ACTIVE', 'INSTALL_FAILED', 'SUSPENDING', 'SUSPENDED', 'RESUMING', 'UPDATING', 'UPDATE_FAILED', 'UNINSTALLING', 'UNINSTALLED', 'UNINSTALL_FAILED');--> statement-breakpoint
CREATE TYPE "platform"."app_lifecycle_operation_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "platform"."app_lifecycle_operation_type" AS ENUM('INSTALL', 'UPDATE', 'SUSPEND', 'RESUME', 'UNINSTALL');--> statement-breakpoint
CREATE TABLE "platform"."app_installation_manifest_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"installation_id" uuid NOT NULL,
	"app_code" varchar(128) NOT NULL,
	"version" varchar(64) NOT NULL,
	"manifest_hash" varchar(64) NOT NULL,
	"manifest" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_installation_manifest_snapshot_key" UNIQUE("installation_id","version","manifest_hash")
);
--> statement-breakpoint
CREATE TABLE "platform"."app_installation_scopes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"installation_id" uuid NOT NULL,
	"scope" varchar(255) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "app_installation_scope_key" UNIQUE("installation_id","scope")
);
--> statement-breakpoint
CREATE TABLE "platform"."app_installation_secrets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"installation_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"ciphertext" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_installation_secret_key" UNIQUE("installation_id","name")
);
--> statement-breakpoint
CREATE TABLE "platform"."app_installations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"app_code" varchar(128) NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"status" "platform"."app_installation_status" DEFAULT 'PENDING_CONSENT' NOT NULL,
	"installed_version" varchar(64),
	"target_version" varchar(64),
	"manifest_hash" varchar(64),
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"configuration_version" integer DEFAULT 1 NOT NULL,
	"installed_by_user_id" uuid,
	"health_status" "platform"."app_installation_health_status" DEFAULT 'UNKNOWN' NOT NULL,
	"last_error_code" varchar(128),
	"last_error_message" text,
	"installed_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"uninstalled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."app_lifecycle_operations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"installation_id" uuid NOT NULL,
	"type" "platform"."app_lifecycle_operation_type" NOT NULL,
	"status" "platform"."app_lifecycle_operation_status" DEFAULT 'PENDING' NOT NULL,
	"target_version" varchar(64) NOT NULL,
	"previous_installation_status" "platform"."app_installation_status",
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
	CONSTRAINT "app_lifecycle_operation_idempotency_key" UNIQUE("installation_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "platform"."slots" ALTER COLUMN "provider_config_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD COLUMN "status" "platform"."slot_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD COLUMN "installation_id" uuid;--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD COLUMN "capability" varchar(128);--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD COLUMN "operation_contract" varchar(128);--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD COLUMN "target_app_code" varchar(128);--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD COLUMN "target_action" varchar(128);--> statement-breakpoint
ALTER TABLE "platform"."app_installation_manifest_snapshots" ADD CONSTRAINT "app_installation_manifest_snapshots_installation_id_app_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "platform"."app_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."app_installation_scopes" ADD CONSTRAINT "app_installation_scopes_installation_id_app_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "platform"."app_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."app_installation_secrets" ADD CONSTRAINT "app_installation_secrets_installation_id_app_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "platform"."app_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."app_lifecycle_operations" ADD CONSTRAINT "app_lifecycle_operations_installation_id_app_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "platform"."app_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_installation_manifest_installation_idx" ON "platform"."app_installation_manifest_snapshots" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "app_installation_scopes_installation_idx" ON "platform"."app_installation_scopes" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "app_installation_secrets_installation_idx" ON "platform"."app_installation_secrets" USING btree ("installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_installations_active_store_app_key" ON "platform"."app_installations" USING btree ("store_id","app_code") WHERE "platform"."app_installations"."status" <> 'UNINSTALLED';--> statement-breakpoint
CREATE INDEX "app_installations_store_status_idx" ON "platform"."app_installations" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "app_installations_organization_idx" ON "platform"."app_installations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "app_lifecycle_operations_installation_idx" ON "platform"."app_lifecycle_operations" USING btree ("installation_id","created_at");--> statement-breakpoint
CREATE INDEX "app_lifecycle_operations_status_idx" ON "platform"."app_lifecycle_operations" USING btree ("status");--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD CONSTRAINT "slots_installation_id_app_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "platform"."app_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slots_installation_capability_operation_key" ON "platform"."slots" USING btree ("installation_id","capability","operation_contract") WHERE "platform"."slots"."installation_id" is not null;--> statement-breakpoint
CREATE INDEX "slots_installation_idx" ON "platform"."slots" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "slots_capability_route_idx" ON "platform"."slots" USING btree ("store_id","capability","operation_contract","status");