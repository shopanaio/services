CREATE TABLE "iam"."casbin_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"ptype" varchar(10) NOT NULL,
	"v0" varchar(256),
	"v1" varchar(256),
	"v2" varchar(256),
	"v3" varchar(256),
	"v4" varchar(256),
	"v5" varchar(256)
);
--> statement-breakpoint
CREATE TABLE "iam"."role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(256),
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."role_hierarchy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_role_id" uuid NOT NULL,
	"child_role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "iam"."user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"role_id" uuid NOT NULL,
	"granted_by" varchar(128),
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iam"."role" ADD CONSTRAINT "role_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_parent_role_id_role_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_child_role_id_role_id_fk" FOREIGN KEY ("child_role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_ptype" ON "iam"."casbin_rule" USING btree ("ptype");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_tenant" ON "iam"."casbin_rule" USING btree ("v4");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_v0" ON "iam"."casbin_rule" USING btree ("v0");--> statement-breakpoint
CREATE INDEX "idx_role_tenant" ON "iam"."role" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_tenant_name" ON "iam"."role" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_hierarchy_unique" ON "iam"."role_hierarchy" USING btree ("tenant_id","parent_role_id","child_role_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_slug" ON "iam"."tenant" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_user_role_tenant_user" ON "iam"."user_role" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_user" ON "iam"."user_role" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_role_unique" ON "iam"."user_role" USING btree ("tenant_id","user_id");