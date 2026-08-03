-- Up Migration

CREATE FUNCTION "orders"."assert_order_operation_integrity"(
  p_store_id uuid,
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM 1
    FROM "orders"."orders"
   WHERE "store_id" = p_store_id
     AND "id" = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_delivery_groups" AS delivery_group
     WHERE delivery_group."store_id" = p_store_id
       AND delivery_group."order_id" = p_order_id
       AND delivery_group."requires_shipping" = true
       AND delivery_group."status" <> 'CANCELLED'
       AND EXISTS (
         SELECT 1
           FROM "orders"."orders" AS current_order
          WHERE current_order."store_id" = delivery_group."store_id"
            AND current_order."id" = delivery_group."order_id"
            AND current_order."status" <> 'DRAFT'
       )
       AND (
         SELECT count(*)
           FROM "orders"."order_delivery_methods" AS method
          WHERE method."store_id" = delivery_group."store_id"
            AND method."order_id" = delivery_group."order_id"
            AND method."delivery_group_id" = delivery_group."id"
            AND method."is_selected" = true
       ) <> 1
  ) THEN
    RAISE EXCEPTION 'Order % has a shippable delivery group without exactly one selected method', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_delivery_groups" AS delivery_group
      JOIN "orders"."order_addresses" AS address
        ON address."store_id" = delivery_group."store_id"
       AND address."order_id" = delivery_group."order_id"
       AND address."id" = delivery_group."address_id"
     WHERE delivery_group."store_id" = p_store_id
       AND delivery_group."order_id" = p_order_id
       AND address."type" <> 'SHIPPING'
  ) THEN
    RAISE EXCEPTION 'Order % uses a non-shipping address for delivery', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_payment_methods" AS payment_method
      JOIN "orders"."order_addresses" AS address
        ON address."store_id" = payment_method."store_id"
       AND address."order_id" = payment_method."order_id"
       AND address."id" = payment_method."billing_address_id"
     WHERE payment_method."store_id" = p_store_id
       AND payment_method."order_id" = p_order_id
       AND address."type" <> 'BILLING'
  ) THEN
    RAISE EXCEPTION 'Order % uses a non-billing address for payment', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."orders" AS current_order
     WHERE current_order."store_id" = p_store_id
       AND current_order."id" = p_order_id
       AND current_order."status" <> 'DRAFT'
       AND NOT EXISTS (
         SELECT 1
           FROM "orders"."order_lines" AS line
          WHERE line."store_id" = current_order."store_id"
            AND line."order_id" = current_order."id"
       )
  ) THEN
    RAISE EXCEPTION 'Order % cannot leave DRAFT status without lines', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."orders" AS current_order
     WHERE current_order."store_id" = p_store_id
       AND current_order."id" = p_order_id
       AND current_order."status" <> 'DRAFT'
       AND current_order."total_amount" > 0
       AND (
         SELECT count(*)
           FROM "orders"."order_payment_methods" AS method
          WHERE method."store_id" = current_order."store_id"
            AND method."order_id" = current_order."id"
            AND method."is_selected" = true
       ) <> 1
  ) THEN
    RAISE EXCEPTION 'Order % does not have exactly one selected payment method', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."orders" AS current_order
      LEFT JOIN "orders"."order_cancellations" AS cancellation
        ON cancellation."store_id" = current_order."store_id"
       AND cancellation."order_id" = current_order."id"
     WHERE current_order."store_id" = p_store_id
       AND current_order."id" = p_order_id
       AND (
         (current_order."status" = 'CANCELLED' AND cancellation."order_id" IS NULL)
         OR (current_order."status" <> 'CANCELLED' AND cancellation."order_id" IS NOT NULL)
         OR current_order."cancelled_at" IS DISTINCT FROM cancellation."cancelled_at"
       )
  ) THEN
    RAISE EXCEPTION 'Order % cancellation record and lifecycle state do not match', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(group_line."quantity"), 0)
           FROM "orders"."order_delivery_group_lines" AS group_line
           JOIN "orders"."order_delivery_groups" AS delivery_group
             ON delivery_group."store_id" = group_line."store_id"
            AND delivery_group."order_id" = group_line."order_id"
            AND delivery_group."id" = group_line."delivery_group_id"
          WHERE group_line."store_id" = line."store_id"
            AND group_line."order_id" = line."order_id"
            AND group_line."order_line_id" = line."id"
            AND delivery_group."status" <> 'CANCELLED'
       ) > line."quantity" - line."cancelled_quantity"
  ) THEN
    RAISE EXCEPTION 'Order % assigns more delivery quantity than purchased', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(fulfillment_order_line."quantity"), 0)
           FROM "orders"."order_fulfillment_order_lines" AS fulfillment_order_line
           JOIN "orders"."order_fulfillment_orders" AS fulfillment_order
             ON fulfillment_order."store_id" = fulfillment_order_line."store_id"
            AND fulfillment_order."order_id" = fulfillment_order_line."order_id"
            AND fulfillment_order."id" = fulfillment_order_line."fulfillment_order_id"
          WHERE fulfillment_order_line."store_id" = line."store_id"
            AND fulfillment_order_line."order_id" = line."order_id"
            AND fulfillment_order_line."order_line_id" = line."id"
            AND fulfillment_order."status" <> 'CANCELLED'
       ) > line."quantity" - line."cancelled_quantity"
  ) THEN
    RAISE EXCEPTION 'Order % routes more fulfillment-order quantity than purchased', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_fulfillment_order_lines" AS fulfillment_order_line
     WHERE fulfillment_order_line."store_id" = p_store_id
       AND fulfillment_order_line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(fulfillment_line."quantity"), 0)
           FROM "orders"."order_fulfillment_lines" AS fulfillment_line
           JOIN "orders"."order_fulfillments" AS fulfillment
             ON fulfillment."store_id" = fulfillment_line."store_id"
            AND fulfillment."order_id" = fulfillment_line."order_id"
            AND fulfillment."id" = fulfillment_line."fulfillment_id"
          WHERE fulfillment_line."store_id" = fulfillment_order_line."store_id"
            AND fulfillment_line."order_id" = fulfillment_order_line."order_id"
            AND fulfillment_line."order_line_id" = fulfillment_order_line."order_line_id"
            AND fulfillment."fulfillment_order_id" = fulfillment_order_line."fulfillment_order_id"
            AND fulfillment."status" NOT IN ('FAILURE', 'CANCELLED')
       ) > fulfillment_order_line."quantity"
  ) THEN
    RAISE EXCEPTION 'Order % fulfills more than a fulfillment-order line quantity', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_delivery_group_lines" AS delivery_group_line
     WHERE delivery_group_line."store_id" = p_store_id
       AND delivery_group_line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(fulfillment_order_line."quantity"), 0)
           FROM "orders"."order_fulfillment_order_lines" AS fulfillment_order_line
           JOIN "orders"."order_fulfillment_orders" AS fulfillment_order
             ON fulfillment_order."store_id" = fulfillment_order_line."store_id"
            AND fulfillment_order."order_id" = fulfillment_order_line."order_id"
            AND fulfillment_order."id" = fulfillment_order_line."fulfillment_order_id"
          WHERE fulfillment_order_line."store_id" = delivery_group_line."store_id"
            AND fulfillment_order_line."order_id" = delivery_group_line."order_id"
            AND fulfillment_order_line."order_line_id" = delivery_group_line."order_line_id"
            AND fulfillment_order."delivery_group_id" = delivery_group_line."delivery_group_id"
            AND fulfillment_order."status" <> 'CANCELLED'
       ) > delivery_group_line."quantity"
  ) THEN
    RAISE EXCEPTION 'Order % routes more fulfillment quantity than assigned to a delivery group', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_fulfillment_lines" AS fulfillment_line
      JOIN "orders"."order_fulfillments" AS fulfillment
        ON fulfillment."store_id" = fulfillment_line."store_id"
       AND fulfillment."order_id" = fulfillment_line."order_id"
       AND fulfillment."id" = fulfillment_line."fulfillment_id"
      LEFT JOIN "orders"."order_fulfillment_order_lines" AS fulfillment_order_line
        ON fulfillment_order_line."store_id" = fulfillment_line."store_id"
       AND fulfillment_order_line."order_id" = fulfillment_line."order_id"
       AND fulfillment_order_line."fulfillment_order_id" = fulfillment."fulfillment_order_id"
       AND fulfillment_order_line."order_line_id" = fulfillment_line."order_line_id"
     WHERE fulfillment_line."store_id" = p_store_id
       AND fulfillment_line."order_id" = p_order_id
       AND fulfillment_order_line."order_line_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Order % fulfills a line outside its fulfillment order', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_fulfillment_order_lines" AS fulfillment_order_line
      JOIN "orders"."order_fulfillment_orders" AS fulfillment_order
        ON fulfillment_order."store_id" = fulfillment_order_line."store_id"
       AND fulfillment_order."order_id" = fulfillment_order_line."order_id"
       AND fulfillment_order."id" = fulfillment_order_line."fulfillment_order_id"
      LEFT JOIN "orders"."order_delivery_group_lines" AS delivery_group_line
        ON delivery_group_line."store_id" = fulfillment_order_line."store_id"
       AND delivery_group_line."order_id" = fulfillment_order_line."order_id"
       AND delivery_group_line."delivery_group_id" = fulfillment_order."delivery_group_id"
       AND delivery_group_line."order_line_id" = fulfillment_order_line."order_line_id"
     WHERE fulfillment_order_line."store_id" = p_store_id
       AND fulfillment_order_line."order_id" = p_order_id
       AND fulfillment_order."delivery_group_id" IS NOT NULL
       AND delivery_group_line."order_line_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Order % routes a fulfillment-order line outside its delivery group', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(fulfillment_line."quantity"), 0)
           FROM "orders"."order_fulfillment_lines" AS fulfillment_line
           JOIN "orders"."order_fulfillments" AS fulfillment
             ON fulfillment."store_id" = fulfillment_line."store_id"
            AND fulfillment."order_id" = fulfillment_line."order_id"
            AND fulfillment."id" = fulfillment_line."fulfillment_id"
          WHERE fulfillment_line."store_id" = line."store_id"
            AND fulfillment_line."order_id" = line."order_id"
            AND fulfillment_line."order_line_id" = line."id"
            AND fulfillment."status" NOT IN ('FAILURE', 'CANCELLED')
       ) > line."quantity" - line."cancelled_quantity"
  ) THEN
    RAISE EXCEPTION 'Order % fulfills more quantity than purchased', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(
           CASE return_request."status"
             WHEN 'REQUESTED' THEN return_line."requested_quantity"
             WHEN 'APPROVED' THEN return_line."approved_quantity"
             WHEN 'IN_TRANSIT' THEN return_line."approved_quantity"
             WHEN 'RECEIVED' THEN return_line."received_quantity"
             WHEN 'COMPLETED' THEN return_line."received_quantity"
             ELSE 0
           END
         ), 0)
           FROM "orders"."order_return_request_lines" AS return_line
           JOIN "orders"."order_return_requests" AS return_request
             ON return_request."store_id" = return_line."store_id"
            AND return_request."order_id" = return_line."order_id"
            AND return_request."id" = return_line."return_request_id"
          WHERE return_line."store_id" = line."store_id"
            AND return_line."order_id" = line."order_id"
            AND return_line."order_line_id" = line."id"
       ) > line."quantity" - line."cancelled_quantity"
  ) THEN
    RAISE EXCEPTION 'Order % returns more quantity than purchased', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(refund_line."quantity"), 0)
           FROM "orders"."order_refund_lines" AS refund_line
           JOIN "orders"."order_refunds" AS refund
             ON refund."store_id" = refund_line."store_id"
            AND refund."order_id" = refund_line."order_id"
            AND refund."id" = refund_line."refund_id"
          WHERE refund_line."store_id" = line."store_id"
            AND refund_line."order_id" = line."order_id"
            AND refund_line."order_line_id" = line."id"
            AND refund."status" IN ('PENDING', 'SUCCEEDED')
       ) > line."quantity"
  ) THEN
    RAISE EXCEPTION 'Order % refunds more line quantity than purchased', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_lines" AS line
     WHERE line."store_id" = p_store_id
       AND line."order_id" = p_order_id
       AND (
         SELECT COALESCE(sum(refund_line."total_amount"), 0)
           FROM "orders"."order_refund_lines" AS refund_line
           JOIN "orders"."order_refunds" AS refund
             ON refund."store_id" = refund_line."store_id"
            AND refund."order_id" = refund_line."order_id"
            AND refund."id" = refund_line."refund_id"
          WHERE refund_line."store_id" = line."store_id"
            AND refund_line."order_id" = line."order_id"
            AND refund_line."order_line_id" = line."id"
            AND refund."status" IN ('PENDING', 'SUCCEEDED')
       ) > line."total_amount"
  ) THEN
    RAISE EXCEPTION 'Order % refunds more line value than purchased', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_exchange_lines" AS exchange_line
     WHERE exchange_line."store_id" = p_store_id
       AND exchange_line."order_id" = p_order_id
       AND exchange_line."status" <> 'CANCELLED'
     GROUP BY
       exchange_line."store_id",
       exchange_line."order_id",
       exchange_line."return_request_id",
       exchange_line."source_order_line_id"
    HAVING sum(exchange_line."quantity") > COALESCE((
      SELECT return_line."approved_quantity"
        FROM "orders"."order_return_request_lines" AS return_line
       WHERE return_line."store_id" = exchange_line."store_id"
         AND return_line."order_id" = exchange_line."order_id"
         AND return_line."return_request_id" = exchange_line."return_request_id"
         AND return_line."order_line_id" = exchange_line."source_order_line_id"
    ), 0)
  ) THEN
    RAISE EXCEPTION 'Order % exchanges more quantity than approved for return', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_refunds" AS refund
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(refund_line."total_amount"), 0) AS amount
          FROM "orders"."order_refund_lines" AS refund_line
         WHERE refund_line."store_id" = refund."store_id"
           AND refund_line."order_id" = refund."order_id"
           AND refund_line."refund_id" = refund."id"
      ) AS lines ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(adjustment."amount"), 0) AS amount
          FROM "orders"."order_refund_adjustments" AS adjustment
         WHERE adjustment."store_id" = refund."store_id"
           AND adjustment."order_id" = refund."order_id"
           AND adjustment."refund_id" = refund."id"
      ) AS adjustments ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(allocation."amount"), 0) AS amount
          FROM "orders"."order_refund_transaction_allocations" AS allocation
         WHERE allocation."store_id" = refund."store_id"
           AND allocation."order_id" = refund."order_id"
           AND allocation."refund_id" = refund."id"
      ) AS transactions ON true
     WHERE refund."store_id" = p_store_id
       AND refund."order_id" = p_order_id
       AND (
         refund."total_amount" <> lines.amount + adjustments.amount
         OR transactions.amount > refund."total_amount"
         OR (
           refund."status" = 'SUCCEEDED'
           AND refund."destination" = 'ORIGINAL_PAYMENT'
           AND transactions.amount <> refund."total_amount"
         )
         OR (
           refund."destination" <> 'ORIGINAL_PAYMENT'
           AND transactions.amount <> 0
         )
       )
  ) THEN
    RAISE EXCEPTION 'Order % contains an inconsistent refund', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_payment_transactions" AS transaction
      LEFT JOIN "orders"."order_payment_transactions" AS parent
        ON parent."store_id" = transaction."store_id"
       AND parent."order_id" = transaction."order_id"
       AND parent."id" = transaction."parent_transaction_id"
     WHERE transaction."store_id" = p_store_id
       AND transaction."order_id" = p_order_id
       AND (
         (transaction."kind" = 'CAPTURE' AND parent."kind" IS DISTINCT FROM 'AUTHORIZATION')
         OR (transaction."kind" = 'VOID' AND parent."kind" IS DISTINCT FROM 'AUTHORIZATION')
         OR (
           transaction."kind" = 'REFUND'
           AND (parent."kind" IS NULL OR parent."kind" NOT IN ('CAPTURE', 'SALE'))
         )
         OR (
           transaction."kind" IN ('CHARGEBACK', 'CHARGEBACK_REVERSAL')
           AND (
             parent."kind" IS NULL
             OR parent."kind" NOT IN ('CAPTURE', 'SALE', 'CHARGEBACK')
           )
         )
         OR (
           transaction."status" = 'SUCCESS'
           AND transaction."kind" IN ('CAPTURE', 'REFUND', 'VOID')
           AND parent."status" IS DISTINCT FROM 'SUCCESS'
         )
       )
  ) THEN
    RAISE EXCEPTION 'Order % contains a payment transaction with an invalid parent', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_payment_transactions" AS authorization
     WHERE authorization."store_id" = p_store_id
       AND authorization."order_id" = p_order_id
       AND authorization."kind" = 'AUTHORIZATION'
       AND authorization."status" = 'SUCCESS'
       AND (
         SELECT COALESCE(sum(child."amount"), 0)
           FROM "orders"."order_payment_transactions" AS child
          WHERE child."store_id" = authorization."store_id"
            AND child."order_id" = authorization."order_id"
            AND child."parent_transaction_id" = authorization."id"
            AND child."kind" IN ('CAPTURE', 'VOID')
            AND child."status" = 'SUCCESS'
       ) > authorization."amount"
  ) THEN
    RAISE EXCEPTION 'Order % captures or voids more than an authorization amount', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_payment_transactions" AS payment
     WHERE payment."store_id" = p_store_id
       AND payment."order_id" = p_order_id
       AND payment."kind" IN ('CAPTURE', 'SALE')
       AND payment."status" = 'SUCCESS'
       AND (
         SELECT COALESCE(sum(refund_transaction."amount"), 0)
           FROM "orders"."order_payment_transactions" AS refund_transaction
          WHERE refund_transaction."store_id" = payment."store_id"
            AND refund_transaction."order_id" = payment."order_id"
            AND refund_transaction."parent_transaction_id" = payment."id"
            AND refund_transaction."kind" = 'REFUND'
            AND refund_transaction."status" = 'SUCCESS'
       ) > payment."amount"
  ) THEN
    RAISE EXCEPTION 'Order % refunds more than a captured or sale transaction amount', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_refund_transaction_allocations" AS allocation
      JOIN "orders"."order_payment_transactions" AS transaction
        ON transaction."store_id" = allocation."store_id"
       AND transaction."order_id" = allocation."order_id"
       AND transaction."id" = allocation."transaction_id"
     WHERE allocation."store_id" = p_store_id
       AND allocation."order_id" = p_order_id
       AND (
         transaction."kind" <> 'REFUND'
         OR (
           EXISTS (
             SELECT 1
               FROM "orders"."order_refunds" AS refund
              WHERE refund."store_id" = allocation."store_id"
                AND refund."order_id" = allocation."order_id"
                AND refund."id" = allocation."refund_id"
                AND refund."status" = 'SUCCEEDED'
           )
           AND transaction."status" <> 'SUCCESS'
         )
       )
  ) THEN
    RAISE EXCEPTION 'Order % links a refund to a non-refund payment transaction', p_order_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "orders"."order_payment_voids" AS payment_void
      JOIN "orders"."order_payment_transactions" AS authorization
        ON authorization."store_id" = payment_void."store_id"
       AND authorization."order_id" = payment_void."order_id"
       AND authorization."id" = payment_void."authorization_transaction_id"
      LEFT JOIN "orders"."order_payment_transactions" AS void_transaction
        ON void_transaction."store_id" = payment_void."store_id"
       AND void_transaction."order_id" = payment_void."order_id"
       AND void_transaction."id" = payment_void."void_transaction_id"
     WHERE payment_void."store_id" = p_store_id
       AND payment_void."order_id" = p_order_id
       AND (
         authorization."kind" <> 'AUTHORIZATION'
         OR (
           payment_void."void_transaction_id" IS NOT NULL
           AND void_transaction."kind" <> 'VOID'
         )
         OR (
           payment_void."status" = 'SUCCEEDED'
           AND (
             void_transaction."status" IS DISTINCT FROM 'SUCCESS'
             OR void_transaction."amount" <> payment_void."amount"
           )
         )
       )
  ) THEN
    RAISE EXCEPTION 'Order % contains an invalid payment void relationship', p_order_id
      USING ERRCODE = '23514';
  END IF;
END;
$function$;

CREATE FUNCTION "orders"."assert_order_operation_integrity_trigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "orders"."assert_order_operation_integrity"(OLD."store_id", OLD."order_id");
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    PERFORM "orders"."assert_order_operation_integrity"(NEW."store_id", NEW."id");
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       OLD."store_id" IS DISTINCT FROM NEW."store_id"
       OR OLD."order_id" IS DISTINCT FROM NEW."order_id"
     ) THEN
    PERFORM "orders"."assert_order_operation_integrity"(OLD."store_id", OLD."order_id");
  END IF;

  PERFORM "orders"."assert_order_operation_integrity"(NEW."store_id", NEW."order_id");
  RETURN NEW;
END;
$function$;

CREATE CONSTRAINT TRIGGER "order_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "orders_operation_integrity"
AFTER INSERT OR UPDATE ON "orders"."orders"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_addresses_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_addresses"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_delivery_groups_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_delivery_groups"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_delivery_group_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_delivery_group_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_delivery_methods_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_delivery_methods"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_payment_methods_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_payment_methods"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_payment_transactions_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_payment_transactions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_fulfillments_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_fulfillments"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_fulfillment_orders_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_fulfillment_orders"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_fulfillment_order_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_fulfillment_order_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_fulfillment_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_fulfillment_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_return_requests_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_return_requests"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_return_request_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_return_request_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_exchange_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_exchange_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_refunds_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_refunds"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_refund_lines_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_refund_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_refund_adjustments_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_refund_adjustments"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_refund_transaction_allocations_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_refund_transaction_allocations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_payment_voids_operation_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "orders"."order_payment_voids"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();

CREATE CONSTRAINT TRIGGER "order_cancellations_operation_integrity"
AFTER INSERT ON "orders"."order_cancellations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "orders"."assert_order_operation_integrity_trigger"();
