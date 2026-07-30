-- Up Migration

CREATE TABLE "app_shopana_bundles"."condition_group" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "logic_operator" varchar(8) NOT NULL DEFAULT 'AND',
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "condition_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "condition_group_rule_id_fk"
    FOREIGN KEY ("rule_id")
    REFERENCES "app_shopana_bundles"."dependency_rule" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_condition_group_rule_id"
  ON "app_shopana_bundles"."condition_group" ("rule_id");

CREATE TABLE "app_shopana_bundles"."condition" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "category" varchar(32) NOT NULL,
  "subject" varchar(32) NOT NULL,
  "operator" varchar(32) NOT NULL,
  "target_type" varchar(32) NOT NULL,
  "target_id" uuid NOT NULL,
  "value" integer,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "condition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "condition_group_id_fk"
    FOREIGN KEY ("group_id")
    REFERENCES "app_shopana_bundles"."condition_group" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_condition_group_id"
  ON "app_shopana_bundles"."condition" ("group_id");

CREATE INDEX "idx_condition_target"
  ON "app_shopana_bundles"."condition" ("target_type", "target_id");
