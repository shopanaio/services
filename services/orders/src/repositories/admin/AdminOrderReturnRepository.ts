import { sql } from "drizzle-orm";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import {
  asRecord,
  jsonObject,
  moneyMinor,
  optionalBoolean,
  optionalString,
  optionalUuid,
  requiredArray,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
import {
  assertAllowedReturnReason,
  extractReturnPolicy,
  restockingFeeMinor,
  returnPolicyViolation,
} from "../../domain/order/returnEligibility.js";
export class AdminOrderReturnRepository extends AdminOrderCoreRepository {
  public async createReturn(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["OPEN", "CLOSED"]);
    const now = new Date().toISOString();
    const policy = extractReturnPolicy(order.metadata);
    const gate = returnPolicyViolation({
      orderStatus: order.status,
      returnWindowStartedAt: await this.returnWindowStartedAt(request.context.storeId, order.id),
      now,
      returnPolicy: policy,
    });
    if (gate) throw new Error(gate);
    const lines = requiredArray(request.input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("ORDER_RETURN_LINES_REQUIRED");
    const returnId = await this.generateUuidV7();
    await this.connection.execute(sql`
      INSERT INTO orders.order_return_requests (
        id, store_id, order_id, status, version, customer_note, merchant_note,
        idempotency_key, requested_by_type, requested_by_id, metadata,
        requested_at, created_at, updated_at
      ) VALUES (
        ${returnId}, ${request.context.storeId}, ${order.id}, 'REQUESTED', 1,
        ${optionalString(request.input.customerNote)}, ${optionalString(request.input.staffNote)},
        ${requiredString(request.input, "idempotencyKey")}, ${request.context.actor.type},
        ${request.context.actor.id}, '{}'::jsonb, ${now}, ${now}, ${now}
      )
    `);
    let returnedValueMinor = 0n;
    for (const line of lines) {
      const orderLineId = requiredUuid(line, "orderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const reasonCode = requiredString(line, "reasonCode");
      assertAllowedReturnReason(policy, reasonCode);
      const available = await this.returnableQuantity(
        request.context.storeId,
        order.id,
        orderLineId,
      );
      if (quantity > available) throw new Error("ORDER_RETURN_QUANTITY_EXCEEDED");
      returnedValueMinor += await this.returnedLineValueMinor(
        request.context.storeId,
        order.id,
        orderLineId,
        quantity,
      );
      await this.connection.execute(sql`
        INSERT INTO orders.order_return_request_lines (
          store_id, order_id, return_request_id, order_line_id, requested_quantity,
          reason, note, disposition, metadata
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${returnId}, ${orderLineId}, ${quantity},
          ${reasonCode}::orders.order_return_reason,
          ${optionalString(line.note)}, 'PENDING', '{}'::jsonb
        )
      `);
    }
    // The policy that gated this request is captured together with the fee it
    // charges, so a later refund settles against the terms of the request
    // instead of re-deriving them from a policy that may have moved on.
    if (policy) {
      await this.connection.execute(sql`
        UPDATE orders.order_return_requests
        SET metadata = ${JSON.stringify({
          returnPolicy: {
            policyId: policy.policyId,
            revision: policy.revision,
            restockingFeePercentage: policy.restockingFeePercentage,
            restockingFeeAmount: restockingFeeMinor(policy, returnedValueMinor).toString(),
            returnedValueAmount: returnedValueMinor.toString(),
            currencyCode: order.currency_code,
          },
        })}::jsonb
        WHERE store_id = ${request.context.storeId} AND id = ${returnId}
      `);
    }
    await this.connection.execute(sql`
      UPDATE orders.orders SET return_status = 'REQUESTED', updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(request, order, command, { returnId, lines }, now);
    return { ...result, resourceId: returnId };
  }

  /** Latest confirmed receipt across every successfully fulfilled parcel. */
  private async returnWindowStartedAt(storeId: string, orderId: string): Promise<string | null> {
    const rows = await this.connection.execute<{ startedAt: string | null }>(sql`
      WITH receipts AS (
        SELECT CASE
          WHEN count(shipment.id) > 0 THEN CASE
            WHEN count(shipment.id) FILTER (
              WHERE shipment.status <> 'CANCELLED'::orders.order_shipment_status
            ) = 0 OR count(shipment.id) FILTER (
              WHERE shipment.status <> 'CANCELLED'::orders.order_shipment_status
                AND shipment.delivered_at IS NULL
            ) > 0 THEN NULL
            ELSE max(shipment.delivered_at) FILTER (
              WHERE shipment.status <> 'CANCELLED'::orders.order_shipment_status
            )
          END
          ELSE fulfillment.completed_at
        END AS receipt_at
        FROM orders.order_fulfillments fulfillment
        LEFT JOIN orders.order_shipments shipment
          ON shipment.store_id = fulfillment.store_id
         AND shipment.order_id = fulfillment.order_id
         AND shipment.fulfillment_id = fulfillment.id
        WHERE fulfillment.store_id = ${storeId} AND fulfillment.order_id = ${orderId}
          AND fulfillment.status = 'SUCCESS'::orders.order_fulfillment_operation_status
        GROUP BY fulfillment.id, fulfillment.completed_at
      )
      SELECT CASE WHEN bool_or(receipt_at IS NULL) THEN NULL
        ELSE max(receipt_at)::text END AS "startedAt"
      FROM receipts
    `);
    return rows[0]?.startedAt ?? null;
  }

  /** Pro-rata value of the requested quantity, used as the restocking-fee base. */
  private async returnedLineValueMinor(
    storeId: string,
    orderId: string,
    orderLineId: string,
    quantity: number,
  ): Promise<bigint> {
    const rows = await this.connection.execute<{ value: string }>(sql`
      SELECT (total_amount * ${quantity} / GREATEST(quantity, 1))::text AS value
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${orderLineId}
    `);
    const value = rows[0]?.value;
    if (!value) throw new Error("ORDER_LINE_NOT_FOUND");
    return BigInt(value);
  }

  public async transitionReturn(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    status: "APPROVED" | "REJECTED" | "CANCELLED",
  ): Promise<MutableAdminOrderCommandResult> {
    const returned = await this.lockReturn(request);
    const allowed =
      status === "APPROVED" || status === "REJECTED" ? ["REQUESTED"] : ["REQUESTED", "APPROVED"];
    if (!allowed.includes(returned.status)) throw new Error("ORDER_RETURN_TRANSITION_INVALID");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_return_requests
      SET status = ${status}::orders.order_return_request_status, version = version + 1,
          merchant_note = COALESCE(${optionalString(request.input.staffNote)}, merchant_note),
          resolved_by_type = ${request.context.actor.type}, resolved_by_id = ${request.context.actor.id},
          resolved_at = CASE WHEN ${status !== "APPROVED"} THEN ${now}::timestamptz ELSE resolved_at END,
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${returned.id}
    `);
    if (status === "APPROVED") {
      const locationId = optionalUuid(request.input.locationId, "locationId");
      await this.connection.execute(sql`
        UPDATE orders.order_return_request_lines
        SET approved_quantity = requested_quantity,
            restock_location_id = ${locationId}
        WHERE store_id = ${request.context.storeId} AND return_request_id = ${returned.id}
      `);
      if (request.input.createReturnShipment === true) {
        if (!locationId) throw new Error("RETURN_SHIPMENT_LOCATION_REQUIRED");
        await this.connection.execute(sql`
          INSERT INTO orders.order_return_shipments (
            store_id, order_id, return_request_id, status, destination_location_id,
            metadata, created_at, updated_at
          ) VALUES (
            ${request.context.storeId}, ${returned.orderId}, ${returned.id}, 'LABEL_CREATED',
            ${locationId}, ${JSON.stringify({ requestedByCommand: command })}::jsonb, ${now}, ${now}
          )
        `);
      }
    }
    const order = await this.lockOrderById(request.context.storeId, returned.orderId);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { returnId: returned.id, status },
      now,
    );
    return { ...result, resourceId: returned.id };
  }

  public async createExchange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["OPEN", "CLOSED"]);
    const inboundLines = requiredArray(request.input, "inboundLines").map(asRecord);
    const outboundLines = requiredArray(request.input, "outboundLines").map(asRecord);
    if (inboundLines.length === 0 || outboundLines.length === 0) {
      throw new Error("ORDER_EXCHANGE_LINES_REQUIRED");
    }
    const returnId = await this.generateUuidV7();
    const exchangeId = await this.generateUuidV7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_return_requests (
        id, store_id, order_id, status, version, merchant_note, idempotency_key,
        requested_by_type, requested_by_id, metadata, requested_at, created_at, updated_at
      ) VALUES (
        ${returnId}, ${request.context.storeId}, ${order.id}, 'APPROVED', 1,
        ${optionalString(request.input.staffNote)}, ${requiredString(request.input, "idempotencyKey")},
        ${request.context.actor.type}, ${request.context.actor.id},
        ${JSON.stringify({ exchangeId })}::jsonb, ${now}, ${now}, ${now}
      )
    `);
    let inboundAmount = 0n;
    for (const line of inboundLines) {
      const orderLineId = requiredUuid(line, "orderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const source = await this.connection.execute<{
        unit_price_amount: string;
        quantity: number;
      }>(sql`
        SELECT unit_price_amount::text AS unit_price_amount, quantity
        FROM orders.order_lines
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id} AND id = ${orderLineId}
        FOR UPDATE
      `);
      const available = await this.returnableQuantity(
        request.context.storeId,
        order.id,
        orderLineId,
      );
      if (!source[0] || quantity > source[0].quantity || quantity > available)
        throw new Error("ORDER_EXCHANGE_QUANTITY_INVALID");
      const returnLineId = await this.generateUuidV7();
      const amount = BigInt(source[0].unit_price_amount) * BigInt(quantity);
      inboundAmount += amount;
      await this.connection.execute(sql`
        INSERT INTO orders.order_return_request_lines (
          id, store_id, order_id, return_request_id, order_line_id, requested_quantity,
          approved_quantity, reason, note, disposition, metadata
        ) VALUES (
          ${returnLineId}, ${request.context.storeId}, ${order.id}, ${returnId}, ${orderLineId},
          ${quantity}, ${quantity}, ${requiredString(line, "reasonCode")}::orders.order_return_reason,
          ${optionalString(line.note)}, 'PENDING', '{}'::jsonb
        )
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_exchange_inbound_lines (
          store_id, order_id, exchange_id, return_request_line_id, quantity, amount
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${exchangeId}, ${returnLineId},
          ${quantity}, ${amount}
        )
      `);
    }
    let outboundAmount = 0n;
    const outbound = outboundLines.map((line) => {
      const quantity = requiredPositiveInt(line, "quantity");
      const amount = moneyMinor(asRecord(line.unitPrice), order.currency_code);
      outboundAmount += amount * BigInt(quantity);
      return { line, quantity, amount };
    });
    await this.connection.execute(sql`
      INSERT INTO orders.order_exchanges (
        id, store_id, order_id, return_request_id, version, status, currency_code,
        inbound_amount, outbound_amount, balance_amount, idempotency_key,
        created_by_type, created_by_id, created_at, updated_at
      ) VALUES (
        ${exchangeId}, ${request.context.storeId}, ${order.id}, ${returnId}, 1, 'OPEN',
        ${order.currency_code}, ${inboundAmount}, ${outboundAmount}, ${outboundAmount - inboundAmount},
        ${requiredString(request.input, "idempotencyKey")}, ${request.context.actor.type},
        ${request.context.actor.id}, ${now}, ${now}
      )
    `);
    for (const item of outbound) {
      await this.connection.execute(sql`
        INSERT INTO orders.order_exchange_outbound_lines (
          store_id, order_id, exchange_id, purchasable_id, variant_id, title, sku, snapshot,
          quantity, unit_price_amount, total_amount
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${exchangeId},
          ${optionalString(item.line.purchasableId) ?? (await this.generateUuidV7())},
          ${optionalString(item.line.purchasableId)}, ${requiredString(item.line, "title")},
          ${optionalString(item.line.sku)}, ${JSON.stringify({
            customFields: jsonObject(item.line.customFields),
            requiresShipping: optionalBoolean(item.line.requiresShipping) ?? true,
            taxable: optionalBoolean(item.line.taxable) ?? true,
          })}::jsonb,
          ${item.quantity}, ${item.amount}, ${item.amount * BigInt(item.quantity)}
        )
      `);
    }
    await this.connection.execute(sql`
      UPDATE orders.orders SET return_status = 'REQUESTED', updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(request, order, command, { returnId, exchangeId }, now);
    return { ...result, resourceId: exchangeId };
  }

  public async cancelExchange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const exchangeId = requiredUuid(request.input, "exchangeId");
    const rows = await this.connection.execute<{
      order_id: string;
      version: number;
      status: string;
    }>(sql`
      SELECT order_id, version, status FROM orders.order_exchanges
      WHERE store_id = ${request.context.storeId} AND id = ${exchangeId} FOR UPDATE
    `);
    const exchange = rows[0];
    if (!exchange) throw new Error("ORDER_EXCHANGE_NOT_FOUND");
    if (!["REQUESTED", "OPEN"].includes(exchange.status))
      throw new Error("ORDER_EXCHANGE_CANCEL_NOT_ALLOWED");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_exchanges SET status = 'CANCELLED', version = version + 1,
        cancelled_at = ${now}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${exchangeId}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_return_requests request
      SET status = 'CANCELLED', version = version + 1, resolved_by_type = ${request.context.actor.type},
        resolved_by_id = ${request.context.actor.id}, resolved_at = ${now}, updated_at = ${now}
      FROM orders.order_exchanges exchange
      WHERE exchange.store_id = request.store_id AND exchange.return_request_id = request.id
        AND exchange.store_id = ${request.context.storeId} AND exchange.id = ${exchangeId}
        AND request.status IN ('REQUESTED', 'APPROVED')
    `);
    const order = await this.lockOrderById(request.context.storeId, exchange.order_id);
    const result = await this.bumpAndAudit(request, order, command, { exchangeId }, now);
    return { ...result, resourceId: exchangeId };
  }

  public async completeExchange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const exchangeId = requiredUuid(request.input, "exchangeId");
    const rows = await this.connection.execute<{
      order_id: string;
      return_request_id: string;
      version: number;
      status: string;
      return_status: string;
      inbound_complete: boolean;
      outbound_complete: boolean;
    }>(sql`
      SELECT exchange.order_id, exchange.return_request_id, exchange.version, exchange.status,
        return_request.status AS return_status,
        NOT EXISTS (
          SELECT 1
          FROM orders.order_exchange_inbound_lines inbound
          JOIN orders.order_return_request_lines return_line
            ON return_line.store_id = inbound.store_id
           AND return_line.order_id = inbound.order_id
           AND return_line.id = inbound.return_request_line_id
          WHERE inbound.store_id = exchange.store_id
            AND inbound.order_id = exchange.order_id
            AND inbound.exchange_id = exchange.id
            AND return_line.received_quantity < inbound.quantity
        ) AS inbound_complete,
        NOT EXISTS (
          SELECT 1
          FROM orders.order_exchange_outbound_lines outbound
          WHERE outbound.store_id = exchange.store_id
            AND outbound.order_id = exchange.order_id
            AND outbound.exchange_id = exchange.id
            AND (
              outbound.replacement_order_line_id IS NULL
              OR COALESCE((
                SELECT sum(fulfillment_line.quantity)
                FROM orders.order_fulfillment_lines fulfillment_line
                JOIN orders.order_fulfillments fulfillment
                  ON fulfillment.store_id = fulfillment_line.store_id
                 AND fulfillment.order_id = fulfillment_line.order_id
                 AND fulfillment.id = fulfillment_line.fulfillment_id
                WHERE fulfillment_line.store_id = outbound.store_id
                  AND fulfillment_line.order_id = outbound.order_id
                  AND fulfillment_line.order_line_id = outbound.replacement_order_line_id
                  AND fulfillment.status NOT IN ('FAILURE', 'CANCELLED')
              ), 0) < outbound.quantity
            )
        ) AS outbound_complete
      FROM orders.order_exchanges exchange
      JOIN orders.order_return_requests return_request
        ON return_request.store_id = exchange.store_id
       AND return_request.order_id = exchange.order_id
       AND return_request.id = exchange.return_request_id
      WHERE exchange.store_id = ${request.context.storeId} AND exchange.id = ${exchangeId}
      FOR UPDATE OF exchange, return_request
    `);
    const exchange = rows[0];
    if (!exchange) throw new Error("ORDER_EXCHANGE_NOT_FOUND");
    if (!["REQUESTED", "OPEN"].includes(exchange.status)) {
      throw new Error("ORDER_EXCHANGE_COMPLETE_NOT_ALLOWED");
    }
    if (exchange.return_status !== "RECEIVED" || !exchange.inbound_complete) {
      throw new Error("ORDER_EXCHANGE_INBOUND_INCOMPLETE");
    }
    if (!exchange.outbound_complete) {
      throw new Error("ORDER_EXCHANGE_OUTBOUND_INCOMPLETE");
    }
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_exchanges
      SET status = 'COMPLETED', completed_at = ${now}, version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${exchangeId}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_return_requests request
      SET status = 'COMPLETED', version = version + 1, resolved_by_type = ${request.context.actor.type},
        resolved_by_id = ${request.context.actor.id}, resolved_at = ${now}, updated_at = ${now},
        merchant_note = COALESCE(${optionalString(request.input.staffNote)}, merchant_note)
      FROM orders.order_exchanges exchange
      WHERE exchange.store_id = request.store_id AND exchange.return_request_id = request.id
        AND exchange.store_id = ${request.context.storeId} AND exchange.id = ${exchangeId}
        AND request.status = 'RECEIVED'
    `);
    const order = await this.lockOrderById(request.context.storeId, exchange.order_id);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      {
        exchangeId,
        completedAt: now,
        // Recorded on the revision the same way the return-receive operation
        // records it, so the notification worker reads the merchant intent from
        // the audited fact instead of a transient command argument.
        notifyCustomer: request.input.notifyCustomer === true,
      },
      now,
    );
    return { ...result, resourceId: exchangeId };
  }
}
