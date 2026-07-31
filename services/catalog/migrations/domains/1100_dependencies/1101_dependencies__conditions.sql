-- Up Migration

CREATE TABLE "catalog"."condition_group" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "logic_operator" varchar(8) NOT NULL DEFAULT 'AND',
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "condition_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "condition_group_configuration_id_id_unique"
    UNIQUE ("configuration_id", "id"),
  CONSTRAINT "condition_group_rule_fk"
    FOREIGN KEY ("configuration_id", "rule_id")
    REFERENCES "catalog"."dependency_rule" ("configuration_id", "id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_condition_group_rule_id"
  ON "catalog"."condition_group" ("rule_id");

CREATE TABLE "catalog"."condition" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "category" varchar(32) NOT NULL,
  "subject" varchar(32) NOT NULL,
  "operator" varchar(32) NOT NULL,
  "target_type" "catalog"."component_target_kind" NOT NULL,
  "target_id" uuid NOT NULL,
  "value" integer,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "condition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "condition_group_fk"
    FOREIGN KEY ("configuration_id", "group_id")
    REFERENCES "catalog"."condition_group" ("configuration_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "condition_target_fk"
    FOREIGN KEY ("configuration_id", "target_id", "target_type")
    REFERENCES "catalog"."component_target" ("configuration_id", "id", "kind")
    ON DELETE CASCADE
);

CREATE INDEX "idx_condition_group_id"
  ON "catalog"."condition" ("group_id");

CREATE INDEX "idx_condition_target"
  ON "catalog"."condition" ("configuration_id", "target_id", "target_type");
