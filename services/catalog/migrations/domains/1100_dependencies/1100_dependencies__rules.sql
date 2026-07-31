-- Up Migration

CREATE TABLE "catalog"."dependency_rule" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 0,
  "logic_operator" varchar(8) NOT NULL DEFAULT 'AND',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dependency_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dependency_rule_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."component_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "dependency_rule_configuration_id_id_unique"
    UNIQUE ("configuration_id", "id")
);

CREATE INDEX "idx_dependency_rule_configuration_id"
  ON "catalog"."dependency_rule" ("configuration_id");

CREATE INDEX "idx_dependency_rule_priority"
  ON "catalog"."dependency_rule" ("configuration_id", "priority");
