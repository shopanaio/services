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
export class AdminOrderReturnRepository extends AdminOrderCoreRepository {
  public async createReturn(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["OPEN", "CLOSED"]);
    const lines = requiredArray(request.input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("ORDER_RETURN_LINES_REQUIRED");
    const returnId = await this.generateUuidV7();
    const now = new Date().toISOString();
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
    for (const line of lines) {
      const orderLineId = requiredUuid(line, "orderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const available = await this.returnableQuantity(
        request.context.storeId,
        order.id,
        orderLineId,
      );
      if (quantity > available) throw new Error("ORDER_RETURN_QUANTITY_EXCEEDED");
      await this.connection.execute(sql`
        INSERT INTO orders.order_return_request_lines (
          store_id, order_id, return_request_id, order_line_id, requested_quantity,
          reason, note, disposition, metadata
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${returnId}, ${orderLineId}, ${quantity},
          ${requiredString(line, "reasonCode")}::orders.order_return_reason,
          ${optionalString(line.note)}, 'PENDING', '{}'::jsonb
        )
      `);
    }
    await this.connection.execute(sql`
      UPDATE orders.orders SET return_status = 'REQUESTED', updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(request, order, command, { returnId, lines }, now);
    return { ...result, resourceId: returnId };
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
    const expectedVersion = requiredPositiveInt(request.input, "expectedVersion");
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
    if (exchange.version !== expectedVersion) throw new Error("ORDER_EXCHANGE_VERSION_CONFLICT");
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
}
