-- Up Migration

CREATE FUNCTION "catalog"."enforce_component_target_subtype"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "catalog"."component_target" AS target
    WHERE target.configuration_id = NEW.configuration_id
      AND target.id = NEW.id
      AND target.kind = NEW.kind
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.kind = 'PRODUCT_COMPONENT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "catalog"."product_component_target" AS subtype
      WHERE subtype.configuration_id = NEW.configuration_id
        AND subtype.id = NEW.id
    ) THEN
      RAISE EXCEPTION
        'component target % in configuration % has no PRODUCT_COMPONENT subtype',
        NEW.id,
        NEW.configuration_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NEW.kind = 'GROUP' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "catalog"."component_group" AS subtype
      WHERE subtype.configuration_id = NEW.configuration_id
        AND subtype.id = NEW.id
    ) THEN
      RAISE EXCEPTION
        'component target % in configuration % has no GROUP subtype',
        NEW.id,
        NEW.configuration_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NEW.kind = 'ITEM' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "catalog"."component_item" AS subtype
      WHERE subtype.configuration_id = NEW.configuration_id
        AND subtype.id = NEW.id
    ) THEN
      RAISE EXCEPTION
        'component target % in configuration % has no ITEM subtype',
        NEW.id,
        NEW.configuration_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "component_target_subtype_required"
AFTER INSERT OR UPDATE
ON "catalog"."component_target"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "catalog"."enforce_component_target_subtype"();

CREATE FUNCTION "catalog"."prevent_component_target_subtype_orphan"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.configuration_id = OLD.configuration_id
    AND NEW.id = OLD.id
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "catalog"."component_target" AS target
    WHERE target.configuration_id = OLD.configuration_id
      AND target.id = OLD.id
      AND target.kind = TG_ARGV[0]::"catalog"."component_target_kind"
  ) THEN
    RAISE EXCEPTION
      'delete component target % in configuration % through component_target',
      OLD.id,
      OLD.configuration_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

CREATE CONSTRAINT TRIGGER "product_component_target_registry_owner"
AFTER DELETE OR UPDATE
ON "catalog"."product_component_target"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "catalog"."prevent_component_target_subtype_orphan"(
  'PRODUCT_COMPONENT'
);

CREATE CONSTRAINT TRIGGER "component_group_registry_owner"
AFTER DELETE OR UPDATE
ON "catalog"."component_group"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "catalog"."prevent_component_target_subtype_orphan"('GROUP');

CREATE CONSTRAINT TRIGGER "component_item_registry_owner"
AFTER DELETE OR UPDATE
ON "catalog"."component_item"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "catalog"."prevent_component_target_subtype_orphan"('ITEM');
