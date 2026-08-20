-- Up Migration

CREATE FUNCTION "orders"."protect_finalized_payment_transaction"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finalized payment transactions cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF OLD."status" IN ('SUCCESS', 'FAILURE', 'CANCELLED') THEN
    RAISE EXCEPTION 'Finalized payment transaction % is immutable', OLD."id"
      USING ERRCODE = '55000';
  END IF;

  IF NEW."store_id" IS DISTINCT FROM OLD."store_id"
     OR NEW."order_id" IS DISTINCT FROM OLD."order_id"
     OR NEW."kind" IS DISTINCT FROM OLD."kind"
     OR NEW."amount" IS DISTINCT FROM OLD."amount"
     OR NEW."currency_code" IS DISTINCT FROM OLD."currency_code"
     OR NEW."provider" IS DISTINCT FROM OLD."provider"
     OR NEW."provider_transaction_id" IS DISTINCT FROM OLD."provider_transaction_id" THEN
    RAISE EXCEPTION 'Payment transaction financial identity is immutable'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE FUNCTION "orders"."delete_draft_order"(p_store_id uuid, p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_status "orders"."order_status";
BEGIN
  SELECT "status" INTO v_status
    FROM "orders"."orders"
   WHERE "store_id" = p_store_id AND "id" = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % was not found', p_order_id USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only draft orders can be permanently deleted' USING ERRCODE = '55000';
  END IF;

  PERFORM set_config('orders.allow_draft_delete', 'on', true);
  DELETE FROM "orders"."order_activity"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_status_history"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_events"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_revisions"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_admin_notes"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_tags"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_contacts"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."order_lines"
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id;
  DELETE FROM "orders"."orders"
   WHERE "store_id" = p_store_id AND "id" = p_order_id;
END;
$function$;

CREATE TRIGGER "order_payment_transactions_protect_finalized"
BEFORE UPDATE OR DELETE ON "orders"."order_payment_transactions"
FOR EACH ROW EXECUTE FUNCTION "orders"."protect_finalized_payment_transaction"();

CREATE FUNCTION "orders"."redact_order_pii"(
  p_store_id uuid,
  p_order_id uuid,
  p_redacted_at timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "orders"."order_contacts"
     SET "first_name" = NULL,
         "last_name" = NULL,
         "middle_name" = NULL,
         "email" = NULL,
         "phone_e164" = NULL,
         "customer_note" = NULL,
         "email_hash" = NULL,
         "phone_hash" = NULL,
         "metadata" = '{}'::jsonb,
         "redacted_at" = p_redacted_at
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id AND "redacted_at" IS NULL;

  UPDATE "orders"."order_addresses"
     SET "address1" = NULL,
         "address2" = NULL,
         "city" = NULL,
         "province_code" = NULL,
         "postal_code" = NULL,
         "company" = NULL,
         "metadata" = '{}'::jsonb,
         "redacted_at" = p_redacted_at
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id AND "redacted_at" IS NULL;

  UPDATE "orders"."order_recipients"
     SET "first_name" = NULL,
         "last_name" = NULL,
         "middle_name" = NULL,
         "email" = NULL,
         "phone" = NULL,
         "metadata" = '{}'::jsonb,
         "redacted_at" = p_redacted_at
   WHERE "store_id" = p_store_id AND "order_id" = p_order_id AND "redacted_at" IS NULL;
END;
$function$;
