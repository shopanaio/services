ALTER TABLE "platform"."provider_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform"."provider_secret_audit_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform"."provider_secrets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "platform"."provider_configs" CASCADE;--> statement-breakpoint
DROP TABLE "platform"."provider_secret_audit_events" CASCADE;--> statement-breakpoint
DROP TABLE "platform"."provider_secrets" CASCADE;--> statement-breakpoint
ALTER TABLE "platform"."slots" DROP CONSTRAINT "slots_store_id_domain_provider_key";--> statement-breakpoint
ALTER TABLE "platform"."slots" DROP CONSTRAINT "slots_provider_config_id_provider_configs_id_fk";
--> statement-breakpoint
DROP INDEX "platform"."idx_slots_store_domain";--> statement-breakpoint
DROP INDEX "platform"."idx_slots_provider_config";--> statement-breakpoint
DROP INDEX "platform"."slots_installation_capability_operation_key";--> statement-breakpoint
ALTER TABLE "platform"."slots" ALTER COLUMN "installation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "platform"."slots" ALTER COLUMN "capability" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "platform"."slots" ALTER COLUMN "operation_contract" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "platform"."slots" ALTER COLUMN "target_app_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "platform"."slots" ALTER COLUMN "target_action" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "slots_installation_capability_operation_key" ON "platform"."slots" USING btree ("installation_id","capability","operation_contract");--> statement-breakpoint
ALTER TABLE "platform"."slots" DROP COLUMN "domain";--> statement-breakpoint
ALTER TABLE "platform"."slots" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "platform"."slots" DROP COLUMN "provider_config_id";--> statement-breakpoint
ALTER TABLE "platform"."slots" DROP COLUMN "capabilities";--> statement-breakpoint
DROP TYPE "platform"."slot_environment";