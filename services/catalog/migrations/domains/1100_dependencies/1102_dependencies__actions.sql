-- Up Migration

CREATE TABLE "catalog"."dependency_action" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "action_type" varchar(32) NOT NULL,
  "target_type" varchar(32) NOT NULL,
  "target_id" uuid,
  "required_value" boolean,
  "price_rule_id" uuid,
  "stackable" boolean NOT NULL DEFAULT false,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "dependency_action_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dependency_action_rule_id_fk"
    FOREIGN KEY ("rule_id")
    REFERENCES "catalog"."dependency_rule" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "dependency_action_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."bundle_price_rule" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "dependency_action_price_rule_check"
    CHECK (
      (
        "action_type" = 'ADJUST_PRICE'
        AND "price_rule_id" IS NOT NULL
      )
      OR (
        "action_type" <> 'ADJUST_PRICE'
        AND "price_rule_id" IS NULL
      )
    )
);

CREATE INDEX "idx_dependency_action_rule_id"
  ON "catalog"."dependency_action" ("rule_id");

CREATE INDEX "idx_dependency_action_target"
  ON "catalog"."dependency_action" ("target_type", "target_id");

CREATE INDEX "idx_dependency_action_price_rule_id"
  ON "catalog"."dependency_action" ("price_rule_id");
