import { sql } from "drizzle-orm";
import type {
  CancelOrderFromCheckoutPlacementV1Params,
  ConfirmOrderFromCheckoutPlacementV1Params,
  CreateOrderFromCheckoutPlacementV1Params,
  CreateOrderFromCheckoutPlacementV1Result,
  GetOrderCheckoutPlacementV1Params,
  OrderCheckoutPlacementV1Result,
} from "@shopana/broker-types";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "@src/infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import { OrderNumberRepository } from "../order-number/OrderNumberRepository.js";

const CREATE_OPERATION = "checkout-placement.create.v1";
const SYSTEM_HOLD = "CHECKOUT_PLACEMENT_AWAITING_FINALIZATION";

type PlacementRow = {
  organization_id: string;
  order_id: string;
  placement_id: string;
  checkout_id: string;
  snapshot_hash: string;
  status: "AWAITING_FINALIZATION" | "CONFIRMED" | "FAILED";
  order_status: "OPEN" | "CANCELLED";
  order_version: number;
  order_number: string;
  placed_at: string;
};

export class OrderCheckoutPlacementRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly orderNumbers: OrderNumberRepository,
  ) {
    super(db, txManager);
  }

  async create(
    input: CreateOrderFromCheckoutPlacementV1Params,
  ): Promise<CreateOrderFromCheckoutPlacementV1Result> {
    const existingIdempotency = await this.connection.execute<{
      request_hash: string;
      response: CreateOrderFromCheckoutPlacementV1Result;
    }>(sql`
      SELECT request_hash, response
      FROM orders.idempotency_records
      WHERE store_id = ${input.storeId}
        AND operation = ${CREATE_OPERATION}
        AND idempotency_key = ${input.idempotencyKey}
        AND status = 'COMPLETED'
      FOR UPDATE
    `);
    const replay = existingIdempotency[0];
    if (replay) {
      if (replay.request_hash !== input.snapshotHash) {
        throw new Error("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
      }
      return { ...replay.response, duplicate: true };
    }

    const conflictingPlacement = await this.findPlacement(input.storeId, input.placementId);
    if (conflictingPlacement) {
      if (
        conflictingPlacement.order_id !== input.requestedOrderId ||
        conflictingPlacement.snapshot_hash !== input.snapshotHash
      ) {
        throw new Error("CHECKOUT_PLACEMENT_CONFLICT");
      }
      return this.toCreateResult(conflictingPlacement, true);
    }

    const orderNumber = await this.orderNumbers.reserve(input.storeId);
    const placedAt = input.snapshot.capturedAt;
    const cost = input.snapshot.cost;
    await this.connection.execute(sql`
      INSERT INTO orders.orders (
        id, store_id, order_number, version, status, payment_status,
        fulfillment_status, delivery_status, return_status, risk_level,
        origin, customer_id, created_by_type, created_by_id, sales_channel,
        checkout_id, external_source, external_id, locale_code, currency_code,
        subtotal_amount, discount_amount, shipping_amount, tax_amount, duty_amount,
        adjustment_amount, total_amount, checkout_snapshot, metadata, placed_at,
        created_at, updated_at
      ) VALUES (
        ${input.requestedOrderId}, ${input.storeId}, ${orderNumber}, 1, 'OPEN',
        ${BigInt(cost.total.amountMinor) === 0n ? "NOT_REQUIRED" : "PENDING"},
        ${input.snapshot.lines.some((line) => line.requiresShipping) ? "ON_HOLD" : "UNFULFILLED"},
        'NOT_SHIPPED', 'NONE', 'NONE', 'CHECKOUT', ${input.snapshot.customer.customerId},
        'SYSTEM', NULL, ${input.snapshot.salesChannel}, ${input.checkoutId},
        ${input.snapshot.externalSource}, ${input.snapshot.externalId}, ${input.snapshot.localeCode},
        ${input.snapshot.currencyCode}, ${cost.subtotal.amountMinor}, ${cost.discount.amountMinor},
        ${cost.shipping.amountMinor}, ${cost.tax.amountMinor}, ${cost.duty.amountMinor},
        ${cost.adjustment.amountMinor}, ${cost.total.amountMinor},
        ${JSON.stringify(input.snapshot)}::jsonb,
        ${JSON.stringify({
          source: { code: "storefront" },
          customFields: input.snapshot.customFields,
          returnPolicy: input.snapshot.returnPolicy,
        })}::jsonb,
        ${placedAt}, ${placedAt}, ${placedAt}
      )
    `);

    await this.insertContact(input);
    for (const line of orderedLines(input.snapshot.lines)) {
      await this.connection.execute(sql`
        INSERT INTO orders.order_lines (
          id, store_id, order_id, currency_code, parent_line_id, purchasable_id,
          purchasable_type, title, sku, image_url, quantity, requires_shipping,
          taxable, unit_price_amount, unit_compare_at_price_amount, subtotal_amount,
          discount_amount, tax_amount, duty_amount, total_amount, purchasable_snapshot,
          metadata, created_at, updated_at
        ) VALUES (
          ${line.id}, ${input.storeId}, ${input.requestedOrderId}, ${input.snapshot.currencyCode},
          ${line.parentLineId}, ${line.purchasableId}, ${line.purchasableType}, ${line.title},
          ${line.sku}, ${line.imageUrl}, ${line.quantity}, ${line.requiresShipping}, ${line.taxable},
          ${line.unitPrice.amountMinor}, ${line.compareAtUnitPrice?.amountMinor ?? null},
          ${line.subtotal.amountMinor}, ${line.discount.amountMinor}, ${line.tax.amountMinor},
          ${line.duty.amountMinor}, ${line.total.amountMinor}, ${JSON.stringify(line.snapshot)}::jsonb,
          '{}'::jsonb, ${placedAt}, ${placedAt}
        )
      `);
      for (const dutyLine of line.dutyLines ?? []) {
        await this.connection.execute(sql`
          INSERT INTO orders.order_line_duties (
            store_id, order_id, order_line_id, title, source, country_code, amount, metadata
          ) VALUES (
            ${input.storeId}, ${input.requestedOrderId}, ${line.id}, ${dutyLine.title},
            'CHECKOUT', ${dutyLine.countryCode}, ${dutyLine.amount.amountMinor}, '{}'::jsonb
          )
        `);
      }
    }

    for (const group of input.snapshot.deliveryGroups) {
      const deliverySubtotalAmount = BigInt(group.selectedMethod?.quotedAmount.amountMinor ?? "0");
      const deliveryTaxAmount = (group.deliveryTaxLines ?? []).reduce(
        (total, taxLine) => total + BigInt(taxLine.amount.amountMinor),
        0n,
      );
      const deliveryTotalAmount = deliverySubtotalAmount + deliveryTaxAmount;
      if (group.address) {
        await this.connection.execute(sql`
          INSERT INTO orders.order_addresses (
            id, store_id, order_id, type, address1, address2, city, country_code,
            province_code, postal_code, company, metadata, created_at, updated_at
          ) VALUES (
            ${group.address.id}, ${input.storeId}, ${input.requestedOrderId}, 'SHIPPING',
            ${group.address.address1}, ${group.address.address2}, ${group.address.city},
            ${group.address.countryCode}, ${group.address.provinceCode}, ${group.address.postalCode},
            ${group.address.company}, ${JSON.stringify(group.address.metadata)}::jsonb, ${placedAt}, ${placedAt}
          )
        `);
      }
      if (group.recipient) {
        await this.connection.execute(sql`
          INSERT INTO orders.order_recipients (
            id, store_id, order_id, first_name, last_name, middle_name, email, phone,
            metadata, created_at, updated_at
          ) VALUES (
            ${group.recipient.id}, ${input.storeId}, ${input.requestedOrderId},
            ${group.recipient.firstName}, ${group.recipient.lastName}, ${group.recipient.middleName},
            ${group.recipient.email}, ${group.recipient.phone}, '{}'::jsonb, ${placedAt}, ${placedAt}
          )
        `);
      }
      await this.connection.execute(sql`
        INSERT INTO orders.order_delivery_groups (
          id, store_id, order_id, currency_code, status, address_id, recipient_id,
          requires_shipping, subtotal_amount, discount_amount, tax_amount, total_amount,
          metadata, created_at, updated_at
        ) VALUES (
          ${group.id}, ${input.storeId}, ${input.requestedOrderId}, ${input.snapshot.currencyCode},
          'ON_HOLD', ${group.address?.id ?? null}, ${group.recipient?.id ?? null}, true,
          ${deliverySubtotalAmount.toString()}, 0, ${deliveryTaxAmount.toString()},
          ${deliveryTotalAmount.toString()}, '{}'::jsonb, ${placedAt}, ${placedAt}
        )
      `);
      for (const lineId of group.lineIds) {
        const line = input.snapshot.lines.find((candidate) => candidate.id === lineId)!;
        await this.connection.execute(sql`
          INSERT INTO orders.order_delivery_group_lines
            (store_id, order_id, delivery_group_id, order_line_id, quantity)
          VALUES (${input.storeId}, ${input.requestedOrderId}, ${group.id}, ${lineId}, ${line.quantity})
        `);
      }
      if (group.selectedMethod) {
        const method = group.selectedMethod;
        await this.connection.execute(sql`
          INSERT INTO orders.order_delivery_methods (
            store_id, order_id, delivery_group_id, currency_code, code, provider, title,
            type, payment_model, quoted_amount, is_selected, provider_data,
            customer_input_snapshot, created_at, updated_at
          ) VALUES (
            ${input.storeId}, ${input.requestedOrderId}, ${group.id}, ${input.snapshot.currencyCode},
            ${method.code}, ${method.provider}, ${method.title}, ${method.type}, ${method.paymentModel},
            ${method.quotedAmount.amountMinor}, true, ${JSON.stringify(method.publicData)}::jsonb,
            '{}'::jsonb, ${placedAt}, ${placedAt}
          )
        `);
      }
      for (const taxLine of group.deliveryTaxLines ?? []) {
        await this.connection.execute(sql`
          INSERT INTO orders.order_delivery_tax_lines (
            store_id, order_id, delivery_group_id, title, source, rate, amount, metadata
          ) VALUES (
            ${input.storeId}, ${input.requestedOrderId}, ${group.id}, ${taxLine.title},
            'CHECKOUT', ${taxLine.rate}, ${taxLine.amount.amountMinor}, '{}'::jsonb
          )
        `);
      }
      const fulfillment = await this.connection.execute<{ id: string }>(sql`
        INSERT INTO orders.order_fulfillment_orders (
          store_id, order_id, delivery_group_id, status, request_status, hold_reason,
          metadata, provider_snapshot, created_at, updated_at
        ) VALUES (
          ${input.storeId}, ${input.requestedOrderId}, ${group.id}, 'ON_HOLD', 'UNSUBMITTED',
          ${SYSTEM_HOLD}, '{}'::jsonb, '{}'::jsonb, ${placedAt}, ${placedAt}
        ) RETURNING id
      `);
      const fulfillmentOrderId = fulfillment[0]?.id;
      if (!fulfillmentOrderId) throw new Error("FULFILLMENT_ORDER_CREATE_FAILED");
      for (const lineId of group.lineIds) {
        const line = input.snapshot.lines.find((candidate) => candidate.id === lineId)!;
        await this.connection.execute(sql`
          INSERT INTO orders.order_fulfillment_order_lines
            (store_id, order_id, fulfillment_order_id, order_line_id, quantity)
          VALUES (${input.storeId}, ${input.requestedOrderId}, ${fulfillmentOrderId}, ${lineId}, ${line.quantity})
        `);
      }
      await this.connection.execute(sql`
        INSERT INTO orders.order_fulfillment_holds (
          store_id, order_id, fulfillment_order_id, reason_code, reason,
          system_managed, created_by_type, created_at
        ) VALUES (
          ${input.storeId}, ${input.requestedOrderId}, ${fulfillmentOrderId}, ${SYSTEM_HOLD},
          'Checkout placement is awaiting finalization', true, 'SYSTEM', ${placedAt}
        )
      `);
    }

    if (input.snapshot.selectedPayment) {
      const payment = input.snapshot.selectedPayment;
      await this.connection.execute(sql`
        INSERT INTO orders.order_payment_methods (
          store_id, order_id, code, provider, title, flow, is_selected,
          provider_data, customer_input_snapshot, created_at, updated_at
        ) VALUES (
          ${input.storeId}, ${input.requestedOrderId}, ${payment.code}, ${payment.provider},
          ${payment.title}, ${payment.flow}, true, ${JSON.stringify(payment.publicData)}::jsonb,
          '{}'::jsonb, ${placedAt}, ${placedAt}
        )
      `);
    }

    for (const discount of input.snapshot.discounts) {
      await this.connection.execute(sql`
        INSERT INTO orders.order_discount_applications (
          store_id, order_id, currency_code, target_type, value_type, code, title,
          provider, value_percentage, value_amount, total_allocated_amount,
          conditions, metadata, applied_at
        ) VALUES (
          ${input.storeId}, ${input.requestedOrderId}, ${input.snapshot.currencyCode},
          ${discount.targetType}, ${discount.valueType}, ${discount.code}, ${discount.title},
          ${discount.provider}, ${discount.valuePercentage}, ${discount.valueAmount?.amountMinor ?? null},
          ${discount.totalAllocatedAmount.amountMinor}, '{}'::jsonb,
          ${JSON.stringify(discount.metadata)}::jsonb, ${placedAt}
        )
      `);
    }

    await this.connection.execute(sql`
      INSERT INTO orders.order_checkout_placements (
        organization_id, store_id, order_id, placement_id, checkout_id, checkout_version,
        result_revision, final_quote_id, final_quote_revision, payment_methods_revision,
        delivery_revision, requested_order_id, contract_version, snapshot_hash, snapshot,
        status, idempotency_key, correlation_id, workflow_id, created_at, updated_at
      ) VALUES (
        ${input.organizationId}, ${input.storeId}, ${input.requestedOrderId}, ${input.placementId},
        ${input.checkoutId}, ${input.checkoutVersion}, ${input.resultRevision}, ${input.finalQuote.quoteId},
        ${input.finalQuote.revision}, ${input.paymentMethodsRevision}, ${input.deliveryRevision},
        ${input.requestedOrderId}, 1, ${input.snapshotHash}, ${JSON.stringify(input.snapshot)}::jsonb,
        'AWAITING_FINALIZATION', ${input.idempotencyKey}, ${input.correlationId}, ${input.workflowId},
        ${placedAt}, ${placedAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_checkout_commitments (
        store_id, order_id, placement_id, inventory_reservation_key, inventory_expires_at,
        pricing_reservation_ids, pricing_redemption_ids, loyalty_commitment,
        delivery_commitments, created_at
      ) VALUES (
        ${input.storeId}, ${input.requestedOrderId}, ${input.placementId},
        ${input.commitments.inventory.reservationKey}, ${input.commitments.inventory.expiresAt},
        ${textArray(input.commitments.pricing.reservationIds)},
        ${textArray(input.commitments.pricing.redemptionIds)},
        ${input.commitments.loyalty ? JSON.stringify(input.commitments.loyalty) : null}::jsonb,
        ${JSON.stringify(input.commitments.delivery)}::jsonb, ${placedAt}
      )
    `);
    await this.insertRevisionAndEvent(
      input,
      "order.placed",
      "checkout_placement_created",
      placedAt,
    );

    const result: CreateOrderFromCheckoutPlacementV1Result = {
      orderId: input.requestedOrderId,
      orderNumber: String(orderNumber),
      orderVersion: 1,
      orderStatus: "OPEN",
      placementStatus: "AWAITING_FINALIZATION",
      placedAt,
      snapshotHash: input.snapshotHash,
      duplicate: false,
    };
    await this.connection.execute(sql`
      INSERT INTO orders.idempotency_records (
        store_id, operation, idempotency_key, request_hash, status,
        resource_type, resource_id, response_status, response, expires_at
      ) VALUES (
        ${input.storeId}, ${CREATE_OPERATION}, ${input.idempotencyKey}, ${input.snapshotHash},
        'COMPLETED', 'Order', ${input.requestedOrderId}, 200, ${JSON.stringify(result)}::jsonb,
        now() + interval '24 hours'
      )
    `);
    return result;
  }

  async confirm(
    input: ConfirmOrderFromCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result> {
    const placement = await this.lockPlacement(input);
    if (placement.status === "CONFIRMED") return toPlacementResult(placement);
    if (placement.status === "FAILED") throw new Error("CHECKOUT_PLACEMENT_ALREADY_FAILED");
    await this.connection.execute(sql`
      UPDATE orders.order_checkout_placements
      SET status = 'CONFIRMED', confirmed_at = ${input.finalizedAt}
      WHERE store_id = ${input.storeId} AND placement_id = ${input.placementId}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_holds
      SET released_by_type = 'SYSTEM', released_at = ${input.finalizedAt},
          release_reason = 'Checkout placement confirmed'
      WHERE store_id = ${input.storeId} AND order_id = ${input.orderId}
        AND reason_code = ${SYSTEM_HOLD} AND system_managed = true AND released_at IS NULL
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = 'OPEN', hold_reason = NULL
      WHERE store_id = ${input.storeId} AND order_id = ${input.orderId}
        AND status = 'ON_HOLD' AND hold_reason = ${SYSTEM_HOLD}
    `);
    await this.bumpAndAudit(input, "order.placement_confirmed", input.finalizedAt, {
      evidence: input.evidence,
    });
    return (await this.get({ ...input, contractVersion: 1 }))!;
  }

  async cancel(
    input: CancelOrderFromCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result> {
    const placement = await this.lockPlacement(input);
    if (placement.status === "FAILED") return toPlacementResult(placement);
    if (placement.status === "CONFIRMED") throw new Error("CHECKOUT_PLACEMENT_ALREADY_CONFIRMED");
    await this.connection.execute(sql`
      UPDATE orders.order_checkout_placements
      SET status = 'FAILED', failed_at = ${input.failedAt}, failure_code = ${input.reasonCode}
      WHERE store_id = ${input.storeId} AND placement_id = ${input.placementId}
    `);
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET version = version + 1, status = 'CANCELLED', fulfillment_status = 'CANCELLED',
          delivery_status = 'CANCELLED', cancelled_at = ${input.failedAt}
      WHERE store_id = ${input.storeId} AND id = ${input.orderId} AND version = ${placement.order_version}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = 'CANCELLED', closed_at = ${input.failedAt}
      WHERE store_id = ${input.storeId} AND order_id = ${input.orderId}
        AND status IN ('OPEN', 'SCHEDULED', 'ON_HOLD')
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_cancellations (
        store_id, order_id, reason, note, cancelled_by_type, idempotency_key,
        metadata, cancelled_at
      ) VALUES (
        ${input.storeId}, ${input.orderId}, 'PAYMENT_ISSUE', ${input.reasonCode}, 'SYSTEM',
        ${input.idempotencyKey}, ${JSON.stringify({
          paymentSessionId: input.paymentSessionId,
          paymentOperationId: input.paymentOperationId,
        })}::jsonb, ${input.failedAt}
      ) ON CONFLICT (store_id, order_id) DO NOTHING
    `);
    await this.insertCurrentRevisionAndEvent(input, "order.placement_failed", input.failedAt, {
      reasonCode: input.reasonCode,
      paymentSessionId: input.paymentSessionId,
      paymentOperationId: input.paymentOperationId,
    });
    return (await this.get({ ...input, contractVersion: 1 }))!;
  }

  async get(
    input: GetOrderCheckoutPlacementV1Params,
  ): Promise<OrderCheckoutPlacementV1Result | null> {
    const orderCondition = input.orderId ? sql`AND o.id = ${input.orderId}` : sql``;
    const rows = await this.connection.execute<PlacementRow>(sql`
      SELECT p.organization_id, p.order_id, p.placement_id, p.checkout_id,
             p.snapshot_hash, p.status, o.status AS order_status, o.version AS order_version,
             o.order_number::text AS order_number, o.placed_at::text AS placed_at
      FROM orders.order_checkout_placements p
      JOIN orders.orders o ON o.store_id = p.store_id AND o.id = p.order_id
      WHERE p.organization_id = ${input.organizationId}
        AND p.store_id = ${input.storeId}
        AND p.placement_id = ${input.placementId}
        ${orderCondition}
      LIMIT 1
    `);
    return rows[0] ? toPlacementResult(rows[0]) : null;
  }

  private async findPlacement(storeId: string, placementId: string): Promise<PlacementRow | null> {
    const rows = await this.connection.execute<PlacementRow>(sql`
      SELECT p.organization_id, p.order_id, p.placement_id, p.checkout_id,
             p.snapshot_hash, p.status, o.status AS order_status, o.version AS order_version,
             o.order_number::text AS order_number, o.placed_at::text AS placed_at
      FROM orders.order_checkout_placements p
      JOIN orders.orders o ON o.store_id = p.store_id AND o.id = p.order_id
      WHERE p.store_id = ${storeId} AND p.placement_id = ${placementId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async lockPlacement(input: {
    organizationId: string;
    storeId: string;
    placementId: string;
    orderId: string;
  }): Promise<PlacementRow> {
    const rows = await this.connection.execute<PlacementRow>(sql`
      SELECT p.organization_id, p.order_id, p.placement_id, p.checkout_id,
             p.snapshot_hash, p.status, o.status AS order_status, o.version AS order_version,
             o.order_number::text AS order_number, o.placed_at::text AS placed_at
      FROM orders.order_checkout_placements p
      JOIN orders.orders o ON o.store_id = p.store_id AND o.id = p.order_id
      WHERE p.organization_id = ${input.organizationId} AND p.store_id = ${input.storeId}
        AND p.placement_id = ${input.placementId} AND p.order_id = ${input.orderId}
      FOR UPDATE OF p, o
    `);
    if (!rows[0]) throw new Error("CHECKOUT_PLACEMENT_NOT_FOUND");
    return rows[0];
  }

  private async insertContact(input: CreateOrderFromCheckoutPlacementV1Params): Promise<void> {
    const customer = input.snapshot.customer;
    if (
      ![customer.firstName, customer.lastName, customer.email, customer.phone].some(Boolean) &&
      !input.snapshot.customerNote
    )
      return;
    await this.connection.execute(sql`
      INSERT INTO orders.order_contacts (
        store_id, order_id, type, first_name, last_name, middle_name, email,
        phone_e164, customer_note, country_code, metadata, created_at, updated_at
      ) VALUES (
        ${input.storeId}, ${input.requestedOrderId}, 'BILLING', ${customer.firstName},
        ${customer.lastName}, ${customer.middleName}, ${customer.email}, ${customer.phone},
        ${input.snapshot.customerNote}, ${customer.countryCode}, '{}'::jsonb,
        ${input.snapshot.capturedAt}, ${input.snapshot.capturedAt}
      )
    `);
  }

  private async insertRevisionAndEvent(
    input: CreateOrderFromCheckoutPlacementV1Params,
    eventType: string,
    reason: string,
    happenedAt: string,
  ): Promise<void> {
    const cost = input.snapshot.cost;
    await this.connection.execute(sql`
      INSERT INTO orders.order_revisions (
        store_id, order_id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        snapshot, reason, created_by_type, created_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        ${JSON.stringify(input.snapshot)}::jsonb, ${reason}, 'SYSTEM', ${happenedAt}
      FROM orders.orders WHERE store_id = ${input.storeId} AND id = ${input.requestedOrderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, order_version, visibility, actor_type,
        correlation_id, idempotency_key, payload, happened_at
      ) VALUES (
        ${input.storeId}, ${input.requestedOrderId}, ${eventType}, 1, 'INTERNAL', 'SYSTEM',
        ${input.correlationId}, ${input.idempotencyKey}, ${JSON.stringify({
          contractVersion: 1,
          placementId: input.placementId,
          checkoutId: input.checkoutId,
          snapshotHash: input.snapshotHash,
          snapshot: input.snapshot,
          commitments: input.commitments,
          totals: cost,
        })}::jsonb, ${happenedAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_status_history (
        store_id, order_id, order_version, order_status, payment_status,
        fulfillment_status, delivery_status, return_status, reason_code,
        actor_type, metadata, happened_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, ${reason}, 'SYSTEM',
        ${JSON.stringify({ placementId: input.placementId, snapshotHash: input.snapshotHash })}::jsonb,
        ${happenedAt}
      FROM orders.orders WHERE store_id = ${input.storeId} AND id = ${input.requestedOrderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        store_id, order_id, order_version, activity_type, visibility, actor_type,
        payload, happened_at
      ) VALUES (
        ${input.storeId}, ${input.requestedOrderId}, 1, ${eventType}, 'INTERNAL', 'SYSTEM',
        ${JSON.stringify({ placementId: input.placementId })}::jsonb, ${happenedAt}
      )
    `);
  }

  private async bumpAndAudit(
    input: ConfirmOrderFromCheckoutPlacementV1Params,
    eventType: string,
    happenedAt: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const updated = await this.connection.execute<{ version: number }>(sql`
      UPDATE orders.orders SET version = version + 1
      WHERE store_id = ${input.storeId} AND id = ${input.orderId}
      RETURNING version
    `);
    if (!updated[0]) throw new Error("ORDER_VERSION_CONFLICT");
    await this.insertCurrentRevisionAndEvent(input, eventType, happenedAt, payload);
  }

  private async insertCurrentRevisionAndEvent(
    input: { storeId: string; orderId: string; correlationId: string; idempotencyKey: string },
    eventType: string,
    happenedAt: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.order_revisions (
        store_id, order_id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        snapshot, reason, created_by_type, created_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        jsonb_build_object('eventType', ${eventType}, 'payload', ${JSON.stringify(payload)}::jsonb),
        ${eventType}, 'SYSTEM', ${happenedAt}
      FROM orders.orders WHERE store_id = ${input.storeId} AND id = ${input.orderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, order_version, visibility, actor_type,
        correlation_id, idempotency_key, payload, happened_at
      ) SELECT store_id, id, ${eventType}, version, 'INTERNAL', 'SYSTEM',
        ${input.correlationId}, ${input.idempotencyKey}, ${JSON.stringify(payload)}::jsonb, ${happenedAt}
      FROM orders.orders WHERE store_id = ${input.storeId} AND id = ${input.orderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_status_history (
        store_id, order_id, order_version, order_status, payment_status,
        fulfillment_status, delivery_status, return_status, reason_code,
        actor_type, metadata, happened_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, ${eventType}, 'SYSTEM',
        ${JSON.stringify(payload)}::jsonb, ${happenedAt}
      FROM orders.orders WHERE store_id = ${input.storeId} AND id = ${input.orderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        store_id, order_id, order_version, activity_type, visibility, actor_type,
        payload, happened_at
      ) SELECT store_id, id, version, ${eventType}, 'INTERNAL', 'SYSTEM',
        ${JSON.stringify(payload)}::jsonb, ${happenedAt}
      FROM orders.orders WHERE store_id = ${input.storeId} AND id = ${input.orderId}
    `);
  }

  private toCreateResult(
    row: PlacementRow,
    duplicate: boolean,
  ): CreateOrderFromCheckoutPlacementV1Result {
    return {
      orderId: row.order_id,
      orderNumber: row.order_number,
      orderVersion: row.order_version,
      orderStatus: "OPEN",
      placementStatus: "AWAITING_FINALIZATION",
      placedAt: row.placed_at,
      snapshotHash: row.snapshot_hash,
      duplicate,
    };
  }
}

function orderedLines<T extends { id: string; parentLineId: string | null }>(
  lines: readonly T[],
): T[] {
  const pending = [...lines];
  const ordered: T[] = [];
  while (pending.length > 0) {
    const index = pending.findIndex(
      (line) => line.parentLineId === null || ordered.some(({ id }) => id === line.parentLineId),
    );
    if (index < 0) throw new Error("ORDER_LINE_PARENT_CYCLE");
    ordered.push(...pending.splice(index, 1));
  }
  return ordered;
}

function textArray(values: readonly string[]) {
  return sql`ARRAY[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;
}

function toPlacementResult(row: PlacementRow): OrderCheckoutPlacementV1Result {
  return {
    orderId: row.order_id,
    placementId: row.placement_id,
    checkoutId: row.checkout_id,
    snapshotHash: row.snapshot_hash,
    status: row.status,
    orderStatus: row.order_status,
    orderVersion: row.order_version,
  };
}
