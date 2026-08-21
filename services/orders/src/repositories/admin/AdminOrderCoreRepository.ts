import { sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import type {
  AdminOrderAuditEventName,
  AdminOrderCommandInput,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import {
  asRecord,
  commandStatus,
  jsonObject,
  moneyMinor,
  optionalBoolean,
  optionalPositiveInt,
  optionalString,
  optionalUuid,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { BaseRepository } from "../BaseRepository.js";

export type OrderRow = Readonly<{
  id: string;
  version: number;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  currency_code: string;
  total_amount: string;
  payment_status: string;
  fulfillment_status: string;
  delivery_status: string;
  return_status: string;
  customer_id: string | null;
  metadata: Record<string, unknown>;
  placed_at: string | null;
}>;

export abstract class AdminOrderCoreRepository extends BaseRepository {
  public constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  protected async lockOrder(
    request: AdminOrderCommandInput,
    allowedStatuses?: OrderRow["status"][],
  ): Promise<OrderRow> {
    const orderId = requiredUuid(request.input, "orderId" in request.input ? "orderId" : "id");
    const order = await this.lockOrderById(request.context.storeId, orderId);
    // A customer acts only on their own order, and the check runs under the same
    // row lock as the mutation so ownership cannot change in between.
    if (request.context.actor.type === "CUSTOMER") {
      if (!request.context.actor.id || order.customer_id !== request.context.actor.id) {
        throw new Error("ORDER_CUSTOMER_MISMATCH");
      }
    }
    if (request.input.expectedVersion !== undefined) {
      const expectedVersion = requiredPositiveInt(request.input, "expectedVersion");
      if (order.version !== expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    }
    if (allowedStatuses && !allowedStatuses.includes(order.status)) {
      throw new Error(`ORDER_${commandStatus(order.status)}_TRANSITION_NOT_ALLOWED`);
    }
    return order;
  }

  protected async lockOrderById(storeId: string, orderId: string): Promise<OrderRow> {
    const rows = await this.connection.execute<OrderRow>(sql`
      SELECT id, version, status, currency_code, total_amount::text AS total_amount,
        payment_status, fulfillment_status, delivery_status, return_status,
        customer_id, metadata, placed_at::text AS placed_at
      FROM orders.orders
      WHERE store_id = ${storeId} AND id = ${orderId}
      FOR UPDATE
    `);
    if (!rows[0]) throw new Error("ORDER_NOT_FOUND");
    return rows[0];
  }

  protected async lockEdit(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    orderVersion: number;
    version: number;
    currencyCode: string;
  }> {
    const editId = requiredUuid(request.input, "editId");
    const expectedEditVersion = requiredPositiveInt(request.input, "expectedEditVersion");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      orderVersion: number;
      version: number;
      currencyCode: string;
      status: string;
      expiresAt: string;
    }>(sql`
      SELECT edit.id, edit.order_id AS "orderId", current_order.version AS "orderVersion",
        edit.version, edit.currency_code AS "currencyCode", edit.status,
        edit.expires_at::text AS "expiresAt"
      FROM orders.order_edit_sessions edit
      JOIN orders.orders current_order
        ON current_order.store_id = edit.store_id AND current_order.id = edit.order_id
      WHERE edit.store_id = ${request.context.storeId} AND edit.id = ${editId}
      FOR UPDATE OF edit, current_order
    `);
    const edit = rows[0];
    if (!edit) throw new Error("ORDER_EDIT_NOT_FOUND");
    if (edit.status !== "ACTIVE") throw new Error("ORDER_EDIT_NOT_ACTIVE");
    if (Date.parse(edit.expiresAt) <= Date.now()) throw new Error("ORDER_EDIT_EXPIRED");
    if (edit.version !== expectedEditVersion) throw new Error("ORDER_EDIT_VERSION_CONFLICT");
    return edit;
  }

  protected async lockFulfillmentOrder(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    version: number;
    status: string;
    holdReason: string | null;
  }> {
    const id = requiredUuid(request.input, "fulfillmentOrderId");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      version: number;
      status: string;
      holdReason: string | null;
    }>(sql`
      SELECT id, order_id AS "orderId", version, status, hold_reason AS "holdReason"
      FROM orders.order_fulfillment_orders
      WHERE store_id = ${request.context.storeId} AND id = ${id}
      FOR UPDATE
    `);
    const fulfillment = rows[0];
    if (!fulfillment) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
    if (fulfillment.version !== requiredPositiveInt(request.input, "expectedVersion")) {
      throw new Error("FULFILLMENT_ORDER_VERSION_CONFLICT");
    }
    return fulfillment;
  }

  protected async lockShipment(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    externalId: string | null;
  }> {
    const id = requiredUuid(request.input, "shipmentId");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      externalId: string | null;
      orderVersion: number;
    }>(sql`
      SELECT shipment.id, shipment.order_id AS "orderId", shipment.external_id AS "externalId",
        current_order.version AS "orderVersion"
      FROM orders.order_shipments shipment
      JOIN orders.orders current_order
        ON current_order.store_id = shipment.store_id AND current_order.id = shipment.order_id
      WHERE shipment.store_id = ${request.context.storeId} AND shipment.id = ${id}
      FOR UPDATE OF shipment, current_order
    `);
    const shipment = rows[0];
    if (!shipment) throw new Error("ORDER_SHIPMENT_NOT_FOUND");
    if (shipment.orderVersion !== requiredPositiveInt(request.input, "expectedVersion")) {
      throw new Error("ORDER_VERSION_CONFLICT");
    }
    return shipment;
  }

  protected async lockReturn(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    version: number;
    status: string;
  }> {
    const id = requiredUuid(request.input, "returnId");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      version: number;
      status: string;
    }>(sql`
      SELECT id, order_id AS "orderId", version, status
      FROM orders.order_return_requests
      WHERE store_id = ${request.context.storeId} AND id = ${id}
      FOR UPDATE
    `);
    const returned = rows[0];
    if (!returned) throw new Error("ORDER_RETURN_NOT_FOUND");
    if (returned.version !== requiredPositiveInt(request.input, "expectedVersion")) {
      throw new Error("ORDER_RETURN_VERSION_CONFLICT");
    }
    return returned;
  }

  protected async bumpAndAudit(
    request: AdminOrderCommandInput,
    order: OrderRow,
    command: AdminOrderAuditEventName,
    payload: unknown,
    happenedAt: string,
    activityId?: string,
  ): Promise<MutableAdminOrderCommandResult> {
    const updated = await this.connection.execute<{ version: number }>(sql`
      UPDATE orders.orders
      SET version = version + 1, updated_at = GREATEST(updated_at, ${happenedAt}::timestamptz)
      WHERE store_id = ${request.context.storeId} AND id = ${order.id} AND version = ${order.version}
      RETURNING version
    `);
    const version = updated[0]?.version;
    if (!version) throw new Error("ORDER_VERSION_CONFLICT");
    await this.insertAudit(request, order.id, version, command, payload, happenedAt, activityId);
    return {
      orderId: order.id,
      orderVersion: version,
      resourceId: order.id,
      operationId: null,
    };
  }

  protected async insertAudit(
    request: AdminOrderCommandInput,
    orderId: string,
    version: number,
    eventType: string,
    payload: unknown,
    happenedAt: string,
    activityId?: string,
  ): Promise<void> {
    const safePayload = JSON.stringify(jsonObject(payload));
    await this.connection.execute(sql`
      INSERT INTO orders.order_revisions (
        store_id, order_id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        snapshot, reason, created_by_type, created_by_id, created_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        jsonb_build_object('eventType', ${eventType}, 'payload', ${safePayload}::jsonb),
        ${eventType}, ${request.context.actor.type}, ${request.context.actor.id}, ${happenedAt}
      FROM orders.orders
      WHERE store_id = ${request.context.storeId} AND id = ${orderId} AND version = ${version}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, order_version, visibility, actor_type, actor_id,
        correlation_id, idempotency_key, payload, happened_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, ${eventType}, ${version}, 'INTERNAL',
        ${request.context.actor.type}, ${request.context.actor.id}, ${request.context.correlationId},
        ${requiredString(request.input, "idempotencyKey")}, ${safePayload}::jsonb, ${happenedAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_status_history (
        store_id, order_id, order_version, order_status, payment_status,
        fulfillment_status, delivery_status, return_status, reason_code,
        actor_type, actor_id, metadata, happened_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, ${eventType}, ${request.context.actor.type},
        ${request.context.actor.id}, ${safePayload}::jsonb, ${happenedAt}
      FROM orders.orders
      WHERE store_id = ${request.context.storeId} AND id = ${orderId} AND version = ${version}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        id, store_id, order_id, order_version, activity_type, visibility,
        actor_type, actor_id, message, payload, happened_at
      ) VALUES (
        ${activityId ?? (await this.generateUuidV7())}, ${request.context.storeId}, ${orderId}, ${version}, ${eventType},
        ${eventType === "orderCommentAdd" && request.input.visibility === "CUSTOMER" ? "CUSTOMER" : "INTERNAL"},
        ${request.context.actor.type}, ${request.context.actor.id},
        ${eventType === "orderCommentAdd" ? requiredString(request.input, "comment") : null},
        ${safePayload}::jsonb, ${happenedAt}
      )
    `);
  }

  protected async insertEventOnly(
    request: AdminOrderCommandInput,
    order: OrderRow,
    eventType: string,
    payload: unknown,
    happenedAt: string,
  ): Promise<void> {
    const safePayload = JSON.stringify(jsonObject(payload));
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, order_version, visibility, actor_type, actor_id,
        correlation_id, idempotency_key, payload, happened_at
      ) VALUES (
        ${request.context.storeId}, ${order.id}, ${eventType}, ${order.version}, 'INTERNAL',
        ${request.context.actor.type}, ${request.context.actor.id}, ${request.context.correlationId},
        ${requiredString(request.input, "idempotencyKey")}, ${safePayload}::jsonb, ${happenedAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        store_id, order_id, order_version, activity_type, visibility, actor_type, actor_id,
        payload, happened_at
      ) VALUES (
        ${request.context.storeId}, ${order.id}, ${order.version}, ${eventType}, 'INTERNAL',
        ${request.context.actor.type}, ${request.context.actor.id}, ${safePayload}::jsonb, ${happenedAt}
      )
    `);
  }

  protected async insertLine(
    storeId: string,
    orderId: string,
    line: Record<string, unknown>,
    currencyCode: string,
    now: string,
  ): Promise<string> {
    const id = optionalUuid(line.id, "line.id") ?? (await this.generateUuidV7());
    const quantity = requiredPositiveInt(line, "quantity");
    const unitPrice = moneyMinor(asRecord(line.unitPrice), currencyCode);
    const compareAt = line.unitCompareAtPrice
      ? moneyMinor(asRecord(line.unitCompareAtPrice), currencyCode)
      : null;
    const unitCost = line.unitCost ? moneyMinor(asRecord(line.unitCost), currencyCode) : null;
    await this.connection.execute(sql`
      INSERT INTO orders.order_lines (
        id, store_id, order_id, currency_code, purchasable_id, purchasable_type,
        title, sku, quantity, requires_shipping, taxable, unit_price_amount,
        unit_compare_at_price_amount, subtotal_amount, discount_amount, tax_amount,
        duty_amount, total_amount, purchasable_snapshot, metadata, created_at, updated_at
      ) VALUES (
        ${id}, ${storeId}, ${orderId}, ${currencyCode},
        ${optionalString(line.purchasableId) ?? id}, 'VARIANT', ${requiredString(line, "title")},
        ${optionalString(line.sku)}, ${quantity}, ${optionalBoolean(line.requiresShipping) ?? true},
        ${optionalBoolean(line.taxable) ?? true}, ${unitPrice}, ${compareAt},
        ${unitPrice * BigInt(quantity)}, 0, 0, 0, ${unitPrice * BigInt(quantity)},
        ${JSON.stringify({ purchasableId: optionalString(line.purchasableId) })}::jsonb,
        ${JSON.stringify({
          customFields: jsonObject(line.customFields),
          weight: line.weight ?? null,
          unitCostMinor: unitCost?.toString() ?? null,
        })}::jsonb,
        ${now}, ${now}
      )
    `);
    return id;
  }

  protected async recalculateOrder(storeId: string, orderId: string, now: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE orders.orders current_order
      SET subtotal_amount = totals.subtotal,
          discount_amount = totals.discount,
          shipping_amount = delivery.shipping,
          tax_amount = totals.tax,
          duty_amount = totals.duty,
          adjustment_amount = adjustments.amount,
          total_amount = totals.subtotal - totals.discount + delivery.shipping
            + totals.tax + totals.duty + adjustments.amount,
          payment_status = CASE
            WHEN totals.subtotal - totals.discount + delivery.shipping
              + totals.tax + totals.duty + adjustments.amount = 0
            THEN 'NOT_REQUIRED'::orders.order_payment_status
            WHEN payment.net_paid >= totals.subtotal - totals.discount + delivery.shipping
              + totals.tax + totals.duty + adjustments.amount
            THEN 'PAID'::orders.order_payment_status
            WHEN payment.net_paid > 0 THEN 'PARTIALLY_PAID'::orders.order_payment_status
            WHEN current_order.payment_status = 'AUTHORIZED'
            THEN 'AUTHORIZED'::orders.order_payment_status
            ELSE 'PENDING'::orders.order_payment_status
          END,
          updated_at = ${now}
      FROM (
        SELECT COALESCE(sum(subtotal_amount), 0) AS subtotal,
          COALESCE(sum(discount_amount), 0) AS discount,
          COALESCE(sum(tax_amount), 0) AS tax,
          COALESCE(sum(duty_amount), 0) AS duty
        FROM orders.order_lines
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ) totals,
      (
        SELECT COALESCE(sum(quoted_amount), 0)::bigint AS shipping
        FROM orders.order_delivery_methods
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND is_selected = true
      ) delivery,
      (
        SELECT COALESCE(sum(amount), 0)::bigint AS amount
        FROM orders.order_adjustments
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ) adjustments,
      (
        SELECT GREATEST(0,
          COALESCE(sum(amount) FILTER (
            WHERE kind IN ('CAPTURE', 'SALE', 'MANUAL') AND status = 'SUCCESS'
          ), 0)
          - COALESCE(sum(amount) FILTER (
            WHERE kind = 'REFUND' AND status = 'SUCCESS'
          ), 0)
        )::bigint AS net_paid
        FROM orders.order_payment_transactions
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ) payment
      WHERE current_order.store_id = ${storeId} AND current_order.id = ${orderId}
    `);
  }

  protected async refreshEditPreview(
    storeId: string,
    editId: string,
    orderId: string,
    currencyCode: string,
  ): Promise<void> {
    const orderRows = await this.connection.execute<{
      discount: string;
      shipping: string;
      tax: string;
      duty: string;
      adjustment: string;
    }>(sql`
      SELECT discount_amount::text AS discount, shipping_amount::text AS shipping,
        tax_amount::text AS tax, duty_amount::text AS duty,
        adjustment_amount::text AS adjustment
      FROM orders.orders
      WHERE store_id = ${storeId} AND id = ${orderId}
      FOR UPDATE
    `);
    if (!orderRows[0]) throw new Error("ORDER_NOT_FOUND");
    const lineRows = await this.connection.execute<{
      id: string;
      quantity: number;
      unitPrice: string;
      discount: string;
      tax: string;
      duty: string;
    }>(sql`
      SELECT id, quantity, unit_price_amount::text AS "unitPrice",
        discount_amount::text AS discount, tax_amount::text AS tax, duty_amount::text AS duty
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId}
      FOR UPDATE
    `);
    const lines = new Map(
      lineRows.map((line) => [
        line.id,
        {
          quantity: line.quantity,
          unitPrice: BigInt(line.unitPrice),
          discount: BigInt(line.discount),
          tax: BigInt(line.tax),
          duty: BigInt(line.duty),
        },
      ]),
    );
    const changes = await this.connection.execute<{
      changeType: string;
      payload: Record<string, unknown>;
    }>(sql`
      SELECT change_type AS "changeType", payload
      FROM orders.order_edit_changes
      WHERE store_id = ${storeId} AND edit_session_id = ${editId}
      ORDER BY sequence
    `);
    let addedDiscount = 0n;
    let removedDiscount = 0n;
    let shipping = BigInt(orderRows[0].shipping);
    for (const change of changes) {
      const payload = asRecord(change.payload);
      if (change.changeType === "orderEditLineAdd") {
        const line = asRecord(payload.line);
        lines.set(requiredUuid(payload, "changeId"), {
          quantity: requiredPositiveInt(line, "quantity"),
          unitPrice: moneyMinor(asRecord(line.unitPrice), currencyCode),
          discount: 0n,
          tax: 0n,
          duty: 0n,
        });
      } else if (change.changeType === "orderEditLineUpdate") {
        const current = lines.get(requiredUuid(payload, "lineId"));
        if (!current) throw new Error("ORDER_LINE_NOT_FOUND");
        current.quantity = optionalPositiveInt(payload.quantity, "quantity") ?? current.quantity;
        current.unitPrice = payload.unitPrice
          ? moneyMinor(asRecord(payload.unitPrice), currencyCode)
          : current.unitPrice;
      } else if (change.changeType === "orderEditLineRemove") {
        if (!lines.delete(requiredUuid(payload, "lineId"))) throw new Error("ORDER_LINE_NOT_FOUND");
      } else if (change.changeType === "orderEditDiscountAdd") {
        addedDiscount += moneyMinor(asRecord(payload.amount), currencyCode);
      } else if (change.changeType === "orderEditDiscountRemove") {
        const discounts = await this.connection.execute<{ amount: string }>(sql`
          SELECT total_allocated_amount::text AS amount
          FROM orders.order_discount_applications
          WHERE store_id = ${storeId} AND order_id = ${orderId}
            AND id = ${requiredUuid(payload, "discountId")}
        `);
        if (!discounts[0]) throw new Error("ORDER_DISCOUNT_NOT_FOUND");
        removedDiscount += BigInt(discounts[0].amount);
      } else if (change.changeType === "orderEditShippingUpdate") {
        const methodCode = optionalString(asRecord(payload.shipping).methodCode);
        if (methodCode) {
          const methods = await this.connection.execute<{ amount: string }>(sql`
            SELECT COALESCE(sum(quoted_amount), 0)::text AS amount
            FROM orders.order_delivery_methods
            WHERE store_id = ${storeId} AND order_id = ${orderId} AND code = ${methodCode}
          `);
          shipping = BigInt(methods[0]?.amount ?? "0");
        }
      }
    }
    let subtotal = 0n;
    let tax = 0n;
    let duty = 0n;
    for (const line of lines.values()) {
      subtotal += line.unitPrice * BigInt(line.quantity);
      tax += line.tax;
      duty += line.duty;
    }
    if (tax === 0n) tax = BigInt(orderRows[0].tax);
    if (duty === 0n) duty = BigInt(orderRows[0].duty);
    const discount = BigInt(orderRows[0].discount) - removedDiscount;
    const adjustment = BigInt(orderRows[0].adjustment) - addedDiscount;
    const total = subtotal - discount + shipping + tax + duty + adjustment;
    if (discount < 0n || total < 0n) throw new Error("ORDER_EDIT_TOTAL_INVALID");
    await this.connection.execute(sql`
      UPDATE orders.order_edit_sessions
      SET subtotal_amount = ${subtotal}, discount_amount = ${discount},
        shipping_amount = ${shipping}, tax_amount = ${tax}, duty_amount = ${duty},
        adjustment_amount = ${adjustment}, total_amount = ${total}
      WHERE store_id = ${storeId} AND id = ${editId}
    `);
  }

  protected async assertLineEditable(
    storeId: string,
    orderId: string,
    lineId: string,
    requestedQuantity: number | null,
  ): Promise<void> {
    const rows = await this.connection.execute<{ committed: number }>(sql`
      SELECT GREATEST(
        COALESCE((SELECT sum(item.quantity)::integer
          FROM orders.order_fulfillment_lines item
          JOIN orders.order_fulfillments fulfillment
            ON fulfillment.store_id = item.store_id AND fulfillment.id = item.fulfillment_id
          WHERE item.store_id = line.store_id AND item.order_id = line.order_id
            AND item.order_line_id = line.id AND fulfillment.status = 'SUCCESS'), 0),
        COALESCE((SELECT sum(item.approved_quantity)::integer
          FROM orders.order_return_request_lines item
          JOIN orders.order_return_requests request
            ON request.store_id = item.store_id AND request.id = item.return_request_id
          WHERE item.store_id = line.store_id AND item.order_id = line.order_id
            AND item.order_line_id = line.id AND request.status NOT IN ('REJECTED', 'CANCELLED')), 0),
        COALESCE((SELECT sum(item.quantity)::integer
          FROM orders.order_refund_lines item
          JOIN orders.order_refunds refund
            ON refund.store_id = item.store_id AND refund.id = item.refund_id
          WHERE item.store_id = line.store_id AND item.order_id = line.order_id
            AND item.order_line_id = line.id AND refund.status <> 'FAILED'), 0)
      ) AS committed
      FROM orders.order_lines line
      WHERE line.store_id = ${storeId} AND line.order_id = ${orderId} AND line.id = ${lineId}
      FOR UPDATE OF line
    `);
    if (!rows[0]) throw new Error("ORDER_LINE_NOT_FOUND");
    if (requestedQuantity !== null && requestedQuantity < rows[0].committed) {
      throw new Error("ORDER_EDIT_QUANTITY_COMMITTED");
    }
  }

  protected async upsertContact(
    request: AdminOrderCommandInput,
    orderId: string,
    contact: Record<string, unknown>,
    now: string,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.order_contacts (
        store_id, order_id, type, first_name, middle_name, last_name, email,
        phone_e164, customer_note, metadata, created_at, updated_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, 'BILLING', ${optionalString(contact.firstName)},
        ${optionalString(contact.middleName)}, ${optionalString(contact.lastName)},
        ${optionalString(contact.email)}, ${optionalString(contact.phone)},
        ${optionalString(contact.note)}, '{}'::jsonb, ${now}, ${now}
      ) ON CONFLICT (store_id, order_id) DO UPDATE
        SET first_name = EXCLUDED.first_name, middle_name = EXCLUDED.middle_name,
            last_name = EXCLUDED.last_name, email = EXCLUDED.email,
            phone_e164 = EXCLUDED.phone_e164, customer_note = EXCLUDED.customer_note,
            updated_at = EXCLUDED.updated_at
    `);
  }

  protected async upsertAddress(
    storeId: string,
    orderId: string,
    type: "BILLING" | "SHIPPING",
    address: Record<string, unknown>,
    now: string,
  ): Promise<string> {
    const existing = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_addresses
      WHERE store_id = ${storeId} AND order_id = ${orderId}
        AND type = ${type}::orders.order_address_type
      ORDER BY created_at, id LIMIT 1 FOR UPDATE
    `);
    const addressId = existing[0]?.id ?? (await this.generateUuidV7());
    if (existing[0]) {
      await this.connection.execute(sql`
        UPDATE orders.order_addresses
        SET address1 = ${optionalString(address.address1)},
          address2 = ${optionalString(address.address2)}, city = ${optionalString(address.city)},
          country_code = ${requiredString(address, "countryCode").toUpperCase()},
          province_code = ${optionalString(address.provinceCode)},
          postal_code = ${optionalString(address.postalCode)},
          company = ${optionalString(address.company)},
          metadata = ${JSON.stringify(jsonObject(address.data))}::jsonb, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${addressId}
      `);
    } else {
      await this.connection.execute(sql`
        INSERT INTO orders.order_addresses (
          id, store_id, order_id, type, address1, address2, city, country_code,
          province_code, postal_code, company, metadata, created_at, updated_at
        ) VALUES (
          ${addressId}, ${storeId}, ${orderId}, ${type}::orders.order_address_type,
          ${optionalString(address.address1)}, ${optionalString(address.address2)},
          ${optionalString(address.city)}, ${requiredString(address, "countryCode").toUpperCase()},
          ${optionalString(address.provinceCode)}, ${optionalString(address.postalCode)},
          ${optionalString(address.company)}, ${JSON.stringify(jsonObject(address.data))}::jsonb,
          ${now}, ${now}
        )
      `);
    }
    return addressId;
  }

  protected async upsertRecipient(
    storeId: string,
    orderId: string,
    recipientId: string | null,
    recipient: Record<string, unknown>,
    now: string,
  ): Promise<string> {
    const id = recipientId ?? (await this.generateUuidV7());
    if (recipientId) {
      await this.connection.execute(sql`
        UPDATE orders.order_recipients
        SET first_name = ${optionalString(recipient.firstName)},
          middle_name = ${optionalString(recipient.middleName)},
          last_name = ${optionalString(recipient.lastName)}, email = ${optionalString(recipient.email)},
          phone = ${optionalString(recipient.phone)}, metadata = ${JSON.stringify({
            company: optionalString(recipient.company),
          })}::jsonb, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${id}
      `);
    } else {
      await this.connection.execute(sql`
        INSERT INTO orders.order_recipients (
          id, store_id, order_id, first_name, middle_name, last_name, email, phone,
          metadata, created_at, updated_at
        ) VALUES (
          ${id}, ${storeId}, ${orderId}, ${optionalString(recipient.firstName)},
          ${optionalString(recipient.middleName)}, ${optionalString(recipient.lastName)},
          ${optionalString(recipient.email)}, ${optionalString(recipient.phone)},
          ${JSON.stringify({ company: optionalString(recipient.company) })}::jsonb, ${now}, ${now}
        )
      `);
    }
    return id;
  }

  protected async syncDraftDelivery(
    storeId: string,
    orderId: string,
    currencyCode: string,
    shipping: Record<string, unknown>,
    now: string,
  ): Promise<void> {
    const current = await this.connection.execute<{
      id: string;
      addressId: string | null;
      recipientId: string | null;
    }>(sql`
      SELECT id, address_id AS "addressId", recipient_id AS "recipientId"
      FROM orders.order_delivery_groups
      WHERE store_id = ${storeId} AND order_id = ${orderId}
      ORDER BY created_at, id LIMIT 1 FOR UPDATE
    `);
    let addressId = current[0]?.addressId ?? null;
    let recipientId = current[0]?.recipientId ?? null;
    if (shipping.address) {
      addressId = await this.upsertAddress(
        storeId,
        orderId,
        "SHIPPING",
        asRecord(shipping.address),
        now,
      );
    }
    if (shipping.recipient) {
      recipientId = await this.upsertRecipient(
        storeId,
        orderId,
        recipientId,
        asRecord(shipping.recipient),
        now,
      );
    }
    const lineTotals = await this.connection.execute<{ subtotal: string }>(sql`
      SELECT COALESCE(sum(subtotal_amount), 0)::text AS subtotal
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
    `);
    const subtotal = BigInt(lineTotals[0]?.subtotal ?? "0");
    const groupId = current[0]?.id ?? (await this.generateUuidV7());
    if (current[0]) {
      await this.connection.execute(sql`
        UPDATE orders.order_delivery_groups
        SET address_id = ${addressId}, recipient_id = ${recipientId},
          requires_shipping = true, subtotal_amount = ${subtotal}, discount_amount = 0,
          tax_amount = 0, total_amount = ${subtotal}, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${groupId}
      `);
    } else {
      await this.connection.execute(sql`
        INSERT INTO orders.order_delivery_groups (
          id, store_id, order_id, currency_code, status, address_id, recipient_id,
          requires_shipping, subtotal_amount, discount_amount, tax_amount, total_amount,
          metadata, created_at, updated_at
        ) VALUES (
          ${groupId}, ${storeId}, ${orderId}, ${currencyCode}, 'OPEN', ${addressId}, ${recipientId},
          true, ${subtotal}, 0, 0, ${subtotal}, '{}'::jsonb, ${now}, ${now}
        )
      `);
    }
    await this.connection.execute(sql`
      DELETE FROM orders.order_delivery_group_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND delivery_group_id = ${groupId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_delivery_group_lines (
        store_id, order_id, delivery_group_id, order_line_id, quantity
      )
      SELECT store_id, order_id, ${groupId}, id, quantity
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
    `);
    const methodCode = optionalString(shipping.methodCode);
    if (methodCode) {
      await this.connection.execute(sql`
        UPDATE orders.order_delivery_methods SET is_selected = false, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND delivery_group_id = ${groupId}
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_delivery_methods (
          store_id, order_id, delivery_group_id, currency_code, code, provider,
          title, type, payment_model, quoted_amount, is_selected,
          provider_data, customer_input_snapshot, created_at, updated_at
        ) VALUES (
          ${storeId}, ${orderId}, ${groupId}, ${currencyCode}, ${methodCode}, 'admin',
          ${methodCode}, 'SHIPPING', 'MERCHANT_COLLECTED', 0, true, '{}'::jsonb,
          '{}'::jsonb, ${now}, ${now}
        ) ON CONFLICT (store_id, order_id, delivery_group_id, code, provider) DO UPDATE
          SET is_selected = true, updated_at = EXCLUDED.updated_at
      `);
    }
    await this.recalculateOrder(storeId, orderId, now);
  }

  protected async refreshDraftDeliveryGroup(
    storeId: string,
    orderId: string,
    now: string,
  ): Promise<void> {
    const groups = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_delivery_groups
      WHERE store_id = ${storeId} AND order_id = ${orderId}
      ORDER BY created_at, id LIMIT 1 FOR UPDATE
    `);
    const groupId = groups[0]?.id;
    if (!groupId) return;
    await this.connection.execute(sql`
      DELETE FROM orders.order_delivery_group_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND delivery_group_id = ${groupId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_delivery_group_lines (
        store_id, order_id, delivery_group_id, order_line_id, quantity
      )
      SELECT store_id, order_id, ${groupId}, id, quantity
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_delivery_groups delivery_group
      SET subtotal_amount = totals.subtotal, discount_amount = 0, tax_amount = 0,
        total_amount = totals.subtotal, updated_at = ${now}
      FROM (
        SELECT COALESCE(sum(subtotal_amount), 0) AS subtotal
        FROM orders.order_lines
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
      ) totals
      WHERE delivery_group.store_id = ${storeId} AND delivery_group.order_id = ${orderId}
        AND delivery_group.id = ${groupId}
    `);
  }

  protected async replaceTags(
    request: AdminOrderCommandInput,
    orderId: string,
    rawTags: readonly unknown[],
    now: string,
  ): Promise<void> {
    const tags = [...new Set(rawTags.map((value) => String(value).trim()).filter(Boolean))];
    await this.connection.execute(sql`
      DELETE FROM orders.order_tags
      WHERE store_id = ${request.context.storeId} AND order_id = ${orderId}
    `);
    for (const tag of tags) {
      await this.connection.execute(sql`
        INSERT INTO orders.order_tags
          (store_id, order_id, tag, added_by_type, added_by_id, created_at)
        VALUES (${request.context.storeId}, ${orderId}, ${tag},
          ${request.context.actor.type}, ${request.context.actor.id}, ${now})
      `);
    }
  }

  protected async writeAdminNote(
    request: AdminOrderCommandInput,
    orderId: string,
    note: string,
    now: string,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.order_admin_notes (
        store_id, order_id, body, created_by_type, created_by_id,
        updated_by_type, updated_by_id, created_at, updated_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, ${note}, ${request.context.actor.type},
        ${request.context.actor.id}, ${request.context.actor.type}, ${request.context.actor.id},
        ${now}, ${now}
      ) ON CONFLICT (store_id, order_id) DO UPDATE
        SET body = EXCLUDED.body, updated_by_type = EXCLUDED.updated_by_type,
            updated_by_id = EXCLUDED.updated_by_id, updated_at = EXCLUDED.updated_at
    `);
  }

  protected async bumpFulfillmentVersion(storeId: string, id: string, now: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders SET version = version + 1, updated_at = ${now}
      WHERE store_id = ${storeId} AND id = ${id}
    `);
  }

  protected async returnableQuantity(
    storeId: string,
    orderId: string,
    orderLineId: string,
  ): Promise<number> {
    const rows = await this.connection.execute<{ available: number }>(sql`
      SELECT GREATEST(
        LEAST(
          line.quantity - line.cancelled_quantity,
          COALESCE((
            SELECT sum(fulfillment_line.quantity)
            FROM orders.order_fulfillment_lines fulfillment_line
            JOIN orders.order_fulfillments fulfillment
              ON fulfillment.store_id = fulfillment_line.store_id
             AND fulfillment.order_id = fulfillment_line.order_id
             AND fulfillment.id = fulfillment_line.fulfillment_id
            WHERE fulfillment_line.store_id = line.store_id
              AND fulfillment_line.order_id = line.order_id
              AND fulfillment_line.order_line_id = line.id
              AND fulfillment.status = 'SUCCESS'
          ), 0)
        ) - COALESCE((
          SELECT sum(return_line.requested_quantity)
          FROM orders.order_return_request_lines return_line
          JOIN orders.order_return_requests request
            ON request.store_id = return_line.store_id
           AND request.order_id = return_line.order_id
           AND request.id = return_line.return_request_id
          WHERE return_line.store_id = line.store_id AND return_line.order_id = line.order_id
            AND return_line.order_line_id = line.id
            AND request.status NOT IN ('REJECTED', 'CANCELLED')
        ), 0),
        0
      )::integer AS available
      FROM orders.order_lines line
      WHERE line.store_id = ${storeId} AND line.order_id = ${orderId} AND line.id = ${orderLineId}
      FOR UPDATE OF line
    `);
    if (!rows[0]) throw new Error("ORDER_LINE_NOT_FOUND");
    return rows[0].available;
  }
}
