-- Up Migration

-- Comparison bindings may target only product-local leaf features. Groups are
-- presentation containers and never carry comparable values.
CREATE FUNCTION "catalog"."comparison_feature_binding_validate_leaf"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  feature_is_group boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM pg_advisory_xact_lock(lock_key)
    FROM (
      SELECT DISTINCT hashtextextended(
        'comparison-feature:' || feature_id::text,
        0
      ) AS lock_key
      FROM (VALUES (OLD.feature_id), (NEW.feature_id)) AS feature_ids(feature_id)
      ORDER BY lock_key
    ) AS feature_locks;
  ELSE
    PERFORM pg_advisory_xact_lock(
      hashtextextended('comparison-feature:' || NEW.feature_id::text, 0)
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.product_id::text || ':' || NEW.field_id::text, 0)
  );

  SELECT pf.is_group
    INTO feature_is_group
  FROM "catalog"."product_feature" pf
  WHERE pf.id = NEW.feature_id;

  IF feature_is_group THEN
    RAISE EXCEPTION
      'comparison feature binding requires a leaf product feature: %',
      NEW.feature_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "catalog"."comparison_field_not_applicable" cfna
    WHERE cfna.product_id = NEW.product_id
      AND cfna.field_id = NEW.field_id
  ) THEN
    RAISE EXCEPTION
      'comparison field cannot be mapped and NOT_APPLICABLE for the same product: %, %',
      NEW.product_id,
      NEW.field_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "comparison_feature_binding_validate_leaf_trigger"
BEFORE INSERT OR UPDATE OF "product_id", "feature_id", "field_id"
ON "catalog"."comparison_feature_binding"
FOR EACH ROW
EXECUTE FUNCTION "catalog"."comparison_feature_binding_validate_leaf"();

-- Preserve the leaf invariant from the opposite write direction as well. A
-- feature that already participates in comparison cannot later become a group.
CREATE FUNCTION "catalog"."comparison_product_feature_validate_group_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('comparison-feature:' || NEW.id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM "catalog"."comparison_feature_binding" cfb
    WHERE cfb.feature_id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'product feature with a comparison binding cannot become a group: %',
      NEW.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "comparison_product_feature_validate_group_update_trigger"
BEFORE UPDATE OF "is_group"
ON "catalog"."product_feature"
FOR EACH ROW
WHEN (NEW."is_group" = true AND OLD."is_group" = false)
EXECUTE FUNCTION "catalog"."comparison_product_feature_validate_group_update"();

CREATE FUNCTION "catalog"."comparison_field_not_applicable_validate"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.product_id::text || ':' || NEW.field_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM "catalog"."comparison_feature_binding" cfb
    WHERE cfb.product_id = NEW.product_id
      AND cfb.field_id = NEW.field_id
  ) THEN
    RAISE EXCEPTION
      'comparison field cannot be NOT_APPLICABLE and mapped for the same product: %, %',
      NEW.product_id,
      NEW.field_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "comparison_field_not_applicable_validate_trigger"
BEFORE INSERT OR UPDATE OF "product_id", "field_id"
ON "catalog"."comparison_field_not_applicable"
FOR EACH ROW
EXECUTE FUNCTION "catalog"."comparison_field_not_applicable_validate"();

-- SINGLE fields may have at most one normalized local value. The local feature
-- can still retain additional unmapped values; they simply do not participate
-- in the canonical comparison matrix.
CREATE FUNCTION "catalog"."comparison_feature_value_binding_validate_cardinality"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  field_cardinality "catalog"."comparison_cardinality";
BEGIN
  -- Serialize values of the same local feature so two concurrent inserts
  -- cannot both pass the SINGLE cardinality check. Lock both owners during a
  -- move and use deterministic order to avoid lock-order inversions.
  IF TG_OP = 'UPDATE' THEN
    PERFORM pg_advisory_xact_lock(lock_key)
    FROM (
      SELECT DISTINCT hashtextextended(
        'comparison-feature:' || feature_id::text,
        0
      ) AS lock_key
      FROM (VALUES (OLD.feature_id), (NEW.feature_id)) AS feature_ids(feature_id)
      ORDER BY lock_key
    ) AS feature_locks;

    PERFORM pg_advisory_xact_lock_shared(lock_key)
    FROM (
      SELECT DISTINCT hashtextextended(
        'comparison-field:' || field_id::text,
        0
      ) AS lock_key
      FROM (VALUES (OLD.field_id), (NEW.field_id)) AS field_ids(field_id)
      ORDER BY lock_key
    ) AS field_locks;
  ELSE
    PERFORM pg_advisory_xact_lock(
      hashtextextended('comparison-feature:' || NEW.feature_id::text, 0)
    );
    PERFORM pg_advisory_xact_lock_shared(
      hashtextextended('comparison-field:' || NEW.field_id::text, 0)
    );
  END IF;

  SELECT cf.cardinality
    INTO field_cardinality
  FROM "catalog"."comparison_feature_binding" cfb
  INNER JOIN "catalog"."comparison_field" cf
    ON cf.id = cfb.field_id
  WHERE cfb.feature_id = NEW.feature_id;

  IF field_cardinality = 'SINGLE' AND EXISTS (
    SELECT 1
    FROM "catalog"."comparison_feature_value_binding" existing
    WHERE existing.feature_id = NEW.feature_id
      AND existing.feature_value_id <> NEW.feature_value_id
  ) THEN
    RAISE EXCEPTION
      'comparison field with SINGLE cardinality accepts one value for feature: %',
      NEW.feature_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "comparison_feature_value_binding_validate_cardinality_trigger"
BEFORE INSERT OR UPDATE OF "feature_id", "feature_value_id", "field_id"
ON "catalog"."comparison_feature_value_binding"
FOR EACH ROW
EXECUTE FUNCTION "catalog"."comparison_feature_value_binding_validate_cardinality"();

-- Changing a populated field from MULTIPLE to SINGLE or changing its canonical
-- numeric unit would invalidate already-normalized data. Callers must remove or
-- rewrite affected value bindings in the same explicit management flow first.
CREATE FUNCTION "catalog"."comparison_field_validate_semantic_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Value writes take the corresponding shared lock. This exclusive lock makes
  -- the emptiness/cardinality checks below stable until the update commits.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('comparison-field:' || OLD.id::text, 0)
  );

  IF NEW.cardinality = 'SINGLE'
     AND OLD.cardinality = 'MULTIPLE'
     AND EXISTS (
       SELECT 1
       FROM "catalog"."comparison_feature_binding" cfb
       INNER JOIN "catalog"."comparison_feature_value_binding" cfvb
         ON cfvb.feature_id = cfb.feature_id
       WHERE cfb.field_id = OLD.id
       GROUP BY cfb.feature_id
       HAVING count(*) > 1
     ) THEN
    RAISE EXCEPTION
      'cannot change populated comparison field to SINGLE cardinality: %',
      OLD.id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.canonical_unit IS DISTINCT FROM OLD.canonical_unit
     AND EXISTS (
       SELECT 1
       FROM "catalog"."comparison_feature_value_binding" cfvb
       WHERE cfvb.field_id = OLD.id
     ) THEN
    RAISE EXCEPTION
      'cannot change canonical unit while normalized values exist: %',
      OLD.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "comparison_field_validate_semantic_update_trigger"
BEFORE UPDATE OF "cardinality", "canonical_unit"
ON "catalog"."comparison_field"
FOR EACH ROW
EXECUTE FUNCTION "catalog"."comparison_field_validate_semantic_update"();
