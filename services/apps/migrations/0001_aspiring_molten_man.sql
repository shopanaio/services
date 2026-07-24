CREATE TABLE "platform"."provider_secret_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"provider_config_id" uuid NOT NULL,
	"secret_name" varchar(128) NOT NULL,
	"action" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."provider_secrets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"provider_config_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"ciphertext" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_secrets_config_name_key" UNIQUE("provider_config_id","name")
);
--> statement-breakpoint
ALTER TABLE "platform"."provider_secret_audit_events" ADD CONSTRAINT "provider_secret_audit_events_provider_config_id_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "platform"."provider_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."provider_secrets" ADD CONSTRAINT "provider_secrets_provider_config_id_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "platform"."provider_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_secret_audit_store_created_idx" ON "platform"."provider_secret_audit_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "provider_secrets_store_idx" ON "platform"."provider_secrets" USING btree ("store_id");