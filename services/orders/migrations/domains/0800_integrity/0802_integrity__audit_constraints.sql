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
