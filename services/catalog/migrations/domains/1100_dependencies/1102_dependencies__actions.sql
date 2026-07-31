-- Up Migration

CREATE TABLE "catalog"."dependency_action" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "action_type" varchar(32) NOT NULL,
  "target_type" "catalog"."component_target_kind" NOT NULL,
  "target_id" uuid NOT NULL,
  "required_value" boolean,
  "price_rule_id" uuid,
  "stackable" boolean NOT NULL DEFAULT false,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "dependency_action_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dependency_action_rule_fk"
    FOREIGN KEY ("configuration_id", "rule_id")
    REFERENCES "catalog"."dependency_rule" ("configuration_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "dependency_action_target_fk"
    FOREIGN KEY ("configuration_id", "target_id", "target_type")
    REFERENCES "catalog"."component_target" ("configuration_id", "id", "kind")
    ON DELETE CASCADE,
  CONSTRAINT "dependency_action_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."component_price_rule" ("id")
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
  ON "catalog"."dependency_action" (
    "configuration_id",
    "target_id",
    "target_type"
  );

CREATE INDEX "idx_dependency_action_price_rule_id"
  ON "catalog"."dependency_action" ("price_rule_id");

CREATE FUNCTION "catalog"."garbage_collect_dependency_action_price_rule"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.price_rule_id IS NOT NULL THEN
    DELETE FROM "catalog"."component_price_rule" AS price_rule
    WHERE price_rule.id = OLD.price_rule_id
      AND NOT EXISTS (
        SELECT 1
        FROM "catalog"."component_item" AS item
        WHERE item.price_rule_id = price_rule.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "catalog"."component_pricing_template" AS template
        WHERE template.price_rule_id = price_rule.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "catalog"."dependency_action" AS action
        WHERE action.price_rule_id = price_rule.id
      );
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER "dependency_action_price_rule_cleanup"
AFTER DELETE
ON "catalog"."dependency_action"
FOR EACH ROW
EXECUTE FUNCTION "catalog"."garbage_collect_dependency_action_price_rule"();
