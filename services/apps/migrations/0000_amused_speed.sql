CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE TYPE "platform"."slot_assignment_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "platform"."slot_environment" AS ENUM('development', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "platform"."slot_status" AS ENUM('active', 'inactive', 'maintenance', 'deprecated');--> statement-breakpoint
CREATE TABLE "platform"."provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" varchar(255) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "platform"."slot_status" DEFAULT 'active' NOT NULL,
	"environment" "platform"."slot_environment" DEFAULT 'production' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_configs_project_id_provider_key" UNIQUE("project_id","provider")
);
--> statement-breakpoint
CREATE TABLE "platform"."slot_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"aggregate" varchar(255) NOT NULL,
	"aggregate_id" varchar(255) NOT NULL,
	"slot_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"precedence" integer DEFAULT 0 NOT NULL,
	"status" "platform"."slot_assignment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_config_id" uuid NOT NULL,
	"capabilities" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slots_project_id_domain_provider_key" UNIQUE("project_id","domain","provider")
);
--> statement-breakpoint
ALTER TABLE "platform"."slot_assignments" ADD CONSTRAINT "slot_assignments_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "platform"."slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."slots" ADD CONSTRAINT "slots_provider_config_id_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "platform"."provider_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_provider_configs_project" ON "platform"."provider_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_slot_assignments_resolve" ON "platform"."slot_assignments" USING btree ("project_id","aggregate","aggregate_id","domain","status","precedence");--> statement-breakpoint
CREATE INDEX "idx_slot_assignments_slot" ON "platform"."slot_assignments" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "idx_slots_project_domain" ON "platform"."slots" USING btree ("project_id","domain");--> statement-breakpoint
CREATE INDEX "idx_slots_provider_config" ON "platform"."slots" USING btree ("provider_config_id");