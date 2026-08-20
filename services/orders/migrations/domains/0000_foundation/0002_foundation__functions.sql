-- Up Migration

CREATE FUNCTION "orders"."touch_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."updated_at" := now();
  RETURN NEW;
END;
$function$;

CREATE FUNCTION "orders"."reject_row_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('orders.allow_draft_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only; % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$function$;
