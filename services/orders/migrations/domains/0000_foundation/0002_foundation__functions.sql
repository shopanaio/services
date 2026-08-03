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
  RAISE EXCEPTION '% is append-only; % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$function$;
