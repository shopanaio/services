-- Up Migration

CREATE FUNCTION "orders"."protect_order_identity"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."store_id" IS DISTINCT FROM OLD."store_id"
     OR NEW."order_number" IS DISTINCT FROM OLD."order_number"
     OR NEW."currency_code" IS DISTINCT FROM OLD."currency_code"
     OR NEW."checkout_id" IS DISTINCT FROM OLD."checkout_id"
     OR NEW."checkout_snapshot" IS DISTINCT FROM OLD."checkout_snapshot"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'Immutable identity or checkout snapshot fields cannot be changed for order %', OLD."id"
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "orders_protect_identity"
BEFORE UPDATE ON "orders"."orders"
FOR EACH ROW
EXECUTE FUNCTION "orders"."protect_order_identity"();

CREATE FUNCTION "orders"."assert_order_audit_consistency"(
  p_store_id uuid,
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_order "orders"."orders"%ROWTYPE;
BEGIN
  SELECT *
    INTO v_order
    FROM "orders"."orders"
   WHERE "store_id" = p_store_id
     AND "id" = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM "orders"."order_revisions" AS revision
     WHERE revision."store_id" = v_order."store_id"
       AND revision."order_id" = v_order."id"
       AND revision."version" = v_order."version"
       AND revision."status" = v_order."status"
       AND revision."payment_status" = v_order."payment_status"
       AND revision."fulfillment_status" = v_order."fulfillment_status"
       AND revision."delivery_status" = v_order."delivery_status"
       AND revision."return_status" = v_order."return_status"
       AND revision."currency_code" = v_order."currency_code"
       AND revision."subtotal_amount" = v_order."subtotal_amount"
       AND revision."discount_amount" = v_order."discount_amount"
       AND revision."shipping_amount" = v_order."shipping_amount"
       AND revision."tax_amount" = v_order."tax_amount"
       AND revision."duty_amount" = v_order."duty_amount"
       AND revision."adjustment_amount" = v_order."adjustment_amount"
       AND revision."total_amount" = v_order."total_amount"
  ) THEN
    RAISE EXCEPTION 'Order % current state has no matching immutable revision', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF (
    SELECT count(*) <> v_order."version" OR max(revision."version") <> v_order."version"
      FROM "orders"."order_revisions" AS revision
     WHERE revision."store_id" = v_order."store_id"
       AND revision."order_id" = v_order."id"
  ) THEN
    RAISE EXCEPTION 'Order % revisions must be contiguous from 1 through the current revision', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM "orders"."order_status_history" AS status_history
     WHERE status_history."store_id" = v_order."store_id"
       AND status_history."order_id" = v_order."id"
       AND status_history."order_version" = v_order."version"
       AND status_history."order_status" = v_order."status"
       AND status_history."payment_status" = v_order."payment_status"
       AND status_history."fulfillment_status" = v_order."fulfillment_status"
       AND status_history."delivery_status" = v_order."delivery_status"
       AND status_history."return_status" = v_order."return_status"
       AND status_history."sequence" = (
         SELECT max(latest."sequence")
           FROM "orders"."order_status_history" AS latest
          WHERE latest."store_id" = v_order."store_id"
            AND latest."order_id" = v_order."id"
       )
  ) THEN
    RAISE EXCEPTION 'Order % current statuses have no matching latest status-history row', p_order_id
      USING ERRCODE = '23514';
  END IF;
END;
$function$;

CREATE FUNCTION "orders"."assert_order_audit_consistency_trigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "orders"."assert_order_audit_consistency"(OLD."store_id", OLD."order_id");
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    PERFORM "orders"."assert_order_audit_consistency"(NEW."store_id", NEW."id");
  ELSE
    PERFORM "orders"."assert_order_audit_consistency"(NEW."store_id", NEW."order_id");
  END IF;

  RETURN NEW;
END;
$function$;

CREATE CONSTRAINT TRIGGER "orders_audit_consistency"
AFTER INSERT OR UPDATE ON "orders"."orders"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_audit_consistency_trigger"();

CREATE CONSTRAINT TRIGGER "order_revisions_audit_consistency"
AFTER INSERT ON "orders"."order_revisions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_audit_consistency_trigger"();

CREATE CONSTRAINT TRIGGER "order_status_history_audit_consistency"
AFTER INSERT ON "orders"."order_status_history"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_audit_consistency_trigger"();
