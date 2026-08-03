-- Up Migration

CREATE FUNCTION "orders"."assert_order_financials"(
  p_store_id uuid,
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_order "orders"."orders"%ROWTYPE;
  v_subtotal numeric;
  v_discount numeric;
  v_shipping numeric;
  v_tax numeric;
  v_duty numeric;
  v_adjustment numeric;
  v_total numeric;
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

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(allocation."amount"), 0) AS amount
          FROM "orders"."order_line_discount_allocations" AS allocation
         WHERE allocation."store_id" = line."store_id"
           AND allocation."order_id" = line."order_id"
           AND allocation."order_line_id" = line."id"
      ) AS discounts ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(tax_line."amount"), 0) AS amount
          FROM "orders"."order_line_tax_lines" AS tax_line
         WHERE tax_line."store_id" = line."store_id"
           AND tax_line."order_id" = line."order_id"
           AND tax_line."order_line_id" = line."id"
      ) AS taxes ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(duty."amount"), 0) AS amount
          FROM "orders"."order_line_duties" AS duty
         WHERE duty."store_id" = line."store_id"
           AND duty."order_id" = line."order_id"
           AND duty."order_line_id" = line."id"
      ) AS duties ON true
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         line."discount_amount" <> discounts.amount
         OR line."tax_amount" <> taxes.amount
         OR line."duty_amount" <> duties.amount
         OR (line."taxable" = false AND line."tax_amount" <> 0)
       )
  ) THEN
    RAISE EXCEPTION 'Order % contains a line whose stored totals do not match allocations', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_line_discount_allocations" AS allocation
      JOIN "orders"."order_discount_applications" AS application
        ON application."store_id" = allocation."store_id"
       AND application."order_id" = allocation."order_id"
       AND application."id" = allocation."discount_application_id"
     WHERE allocation."store_id" = p_store_id
       AND allocation."order_id" = p_order_id
       AND application."target_type" <> 'ORDER_LINES'
  ) THEN
    RAISE EXCEPTION 'Order % applies a non-line discount to an order line', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_delivery_groups" AS delivery_group
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(allocation."amount"), 0) AS amount
          FROM "orders"."order_delivery_discount_allocations" AS allocation
         WHERE allocation."store_id" = delivery_group."store_id"
           AND allocation."order_id" = delivery_group."order_id"
           AND allocation."delivery_group_id" = delivery_group."id"
      ) AS discounts ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(tax_line."amount"), 0) AS amount
          FROM "orders"."order_delivery_tax_lines" AS tax_line
         WHERE tax_line."store_id" = delivery_group."store_id"
           AND tax_line."order_id" = delivery_group."order_id"
           AND tax_line."delivery_group_id" = delivery_group."id"
      ) AS taxes ON true
     WHERE delivery_group."store_id" = p_store_id
       AND delivery_group."order_id" = p_order_id
       AND (
         delivery_group."discount_amount" <> discounts.amount
         OR delivery_group."tax_amount" <> taxes.amount
       )
  ) THEN
    RAISE EXCEPTION 'Order % contains a delivery group whose stored totals do not match allocations', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_delivery_discount_allocations" AS allocation
      JOIN "orders"."order_discount_applications" AS application
        ON application."store_id" = allocation."store_id"
       AND application."order_id" = allocation."order_id"
       AND application."id" = allocation."discount_application_id"
     WHERE allocation."store_id" = p_store_id
       AND allocation."order_id" = p_order_id
       AND application."target_type" <> 'DELIVERY'
  ) THEN
    RAISE EXCEPTION 'Order % applies a non-delivery discount to delivery', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_discount_applications" AS application
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(line_allocation."amount"), 0) AS amount
          FROM "orders"."order_line_discount_allocations" AS line_allocation
         WHERE line_allocation."store_id" = application."store_id"
           AND line_allocation."order_id" = application."order_id"
           AND line_allocation."discount_application_id" = application."id"
      ) AS line_allocations ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(delivery_allocation."amount"), 0) AS amount
          FROM "orders"."order_delivery_discount_allocations" AS delivery_allocation
         WHERE delivery_allocation."store_id" = application."store_id"
           AND delivery_allocation."order_id" = application."order_id"
           AND delivery_allocation."discount_application_id" = application."id"
      ) AS delivery_allocations ON true
     WHERE application."store_id" = p_store_id
       AND application."order_id" = p_order_id
       AND application."total_allocated_amount" <>
         line_allocations.amount + delivery_allocations.amount
  ) THEN
    RAISE EXCEPTION 'Order % contains a discount application with inconsistent allocations', p_order_id
      USING ERRCODE = '23514';
  END IF;

  SELECT
    COALESCE(sum(line."subtotal_amount"), 0),
    COALESCE(sum(line."discount_amount"), 0),
    COALESCE(sum(line."tax_amount"), 0),
    COALESCE(sum(line."duty_amount"), 0),
    COALESCE(sum(line."total_amount"), 0)
    INTO v_subtotal, v_discount, v_tax, v_duty, v_total
    FROM "orders"."order_lines" AS line
   WHERE line."store_id" = p_store_id
     AND line."order_id" = p_order_id;

  SELECT
    COALESCE(sum(delivery_group."subtotal_amount"), 0),
    v_discount + COALESCE(sum(delivery_group."discount_amount"), 0),
    v_tax + COALESCE(sum(delivery_group."tax_amount"), 0),
    v_total + COALESCE(sum(delivery_group."total_amount"), 0)
    INTO v_shipping, v_discount, v_tax, v_total
    FROM "orders"."order_delivery_groups" AS delivery_group
   WHERE delivery_group."store_id" = p_store_id
     AND delivery_group."order_id" = p_order_id;

  SELECT COALESCE(sum(adjustment."amount"), 0)
    INTO v_adjustment
    FROM "orders"."order_adjustments" AS adjustment
   WHERE adjustment."store_id" = p_store_id
     AND adjustment."order_id" = p_order_id;

  v_total := v_total + v_adjustment;

  IF v_order."subtotal_amount" <> v_subtotal
     OR v_order."discount_amount" <> v_discount
     OR v_order."shipping_amount" <> v_shipping
     OR v_order."tax_amount" <> v_tax
     OR v_order."duty_amount" <> v_duty
     OR v_order."adjustment_amount" <> v_adjustment
     OR v_order."total_amount" <> v_total THEN
    RAISE EXCEPTION 'Order % financial summary does not match its normalized lines and allocations', p_order_id
      USING ERRCODE = '23514';
  END IF;
END;
$function$;

CREATE FUNCTION "orders"."assert_order_financials_trigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "orders"."assert_order_financials"(OLD."store_id", OLD."order_id");
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND TG_TABLE_NAME <> 'orders'
     AND (
       OLD."store_id" IS DISTINCT FROM NEW."store_id"
       OR OLD."order_id" IS DISTINCT FROM NEW."order_id"
     ) THEN
    PERFORM "orders"."assert_order_financials"(OLD."store_id", OLD."order_id");
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    PERFORM "orders"."assert_order_financials"(NEW."store_id", NEW."id");
  ELSE
    PERFORM "orders"."assert_order_financials"(NEW."store_id", NEW."order_id");
  END IF;

  RETURN NEW;
END;
$function$;

CREATE CONSTRAINT TRIGGER "orders_financial_consistency"
AFTER INSERT OR UPDATE ON "orders"."orders"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_lines_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_discount_applications_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_discount_applications"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_line_discount_allocations_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_line_discount_allocations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_line_tax_lines_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_line_tax_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_line_duties_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_line_duties"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_adjustments_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_adjustments"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_delivery_groups_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_delivery_groups"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_delivery_discount_allocations_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_delivery_discount_allocations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();

CREATE CONSTRAINT TRIGGER "order_delivery_tax_lines_financial_consistency"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_delivery_tax_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_financials_trigger"();
