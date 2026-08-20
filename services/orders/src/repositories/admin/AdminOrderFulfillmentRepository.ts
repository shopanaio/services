import { sql } from "drizzle-orm";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import {
  asRecord,
  optionalString,
  requiredArray,
  requiredDateTime,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
export class AdminOrderFulfillmentRepository extends AdminOrderCoreRepository {
  public async splitFulfillmentOrder(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    const selections = requiredArray(request.input, "lines").map(asRecord);
    if (selections.length === 0) throw new Error("FULFILLMENT_LINES_REQUIRED");
    const newId = await this.generateUuidV7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillment_orders (
        id, store_id, order_id, delivery_group_id, version, status, request_status,
        assigned_location_id, hold_reason, external_source, external_id, metadata,
        provider_snapshot, created_at, updated_at
      ) SELECT ${newId}, store_id, order_id, delivery_group_id, 1, 'OPEN', 'UNSUBMITTED',
        assigned_location_id, NULL, external_source, external_id,
        jsonb_build_object('splitFrom', id), provider_snapshot, ${now}, ${now}
      FROM orders.order_fulfillment_orders
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    for (const selection of selections) {
      const sourceLineId = requiredUuid(selection, "fulfillmentOrderLineId");
      const quantity = requiredPositiveInt(selection, "quantity");
      const rows = await this.connection.execute<{ order_line_id: string; quantity: number }>(sql`
        SELECT order_line_id, quantity
        FROM orders.order_fulfillment_order_lines
        WHERE store_id = ${request.context.storeId}
          AND fulfillment_order_id = ${fulfillment.id} AND order_line_id = ${sourceLineId}
        FOR UPDATE
      `);
      const source = rows[0];
      if (!source || quantity >= source.quantity)
        throw new Error("FULFILLMENT_SPLIT_QUANTITY_INVALID");
      await this.connection.execute(sql`
        UPDATE orders.order_fulfillment_order_lines SET quantity = quantity - ${quantity}
        WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillment.id}
          AND order_line_id = ${sourceLineId}
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_fulfillment_order_lines
          (store_id, order_id, fulfillment_order_id, order_line_id, quantity)
        VALUES (${request.context.storeId}, ${fulfillment.orderId}, ${newId}, ${sourceLineId}, ${quantity})
      `);
    }
    await this.bumpFulfillmentVersion(request.context.storeId, fulfillment.id, now);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { sourceFulfillmentOrderId: fulfillment.id, fulfillmentOrderId: newId },
      now,
    );
    return { ...result, resourceId: newId };
  }

  public async moveFulfillmentOrder(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    if (!["OPEN", "SCHEDULED", "ON_HOLD"].includes(fulfillment.status)) {
      throw new Error("FULFILLMENT_MOVE_NOT_ALLOWED");
    }
    const locationId = requiredUuid(request.input, "locationId");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET assigned_location_id = ${locationId}, version = version + 1,
          metadata = jsonb_set(metadata, '{serviceCode}', ${JSON.stringify(optionalString(request.input.serviceCode))}::jsonb, true),
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(request, order, command, request.input, now);
    return { ...result, resourceId: fulfillment.id };
  }

  public async holdFulfillmentOrder(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    if (["CLOSED", "CANCELLED"].includes(fulfillment.status)) {
      throw new Error("FULFILLMENT_HOLD_NOT_ALLOWED");
    }
    const holdId = await this.generateUuidV7();
    const now = new Date().toISOString();
    const reasonCode = requiredString(request.input, "reasonCode");
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillment_holds (
        id, store_id, order_id, fulfillment_order_id, reason_code, reason,
        system_managed, created_by_type, created_by_id, created_at
      ) VALUES (
        ${holdId}, ${request.context.storeId}, ${fulfillment.orderId}, ${fulfillment.id},
        ${reasonCode}, ${optionalString(request.input.note) ?? reasonCode}, false,
        ${request.context.actor.type}, ${request.context.actor.id}, ${now}
      )
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = 'ON_HOLD', hold_reason = ${reasonCode}, version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(request, order, command, { holdId, reasonCode }, now);
    return { ...result, resourceId: fulfillment.id };
  }

  public async releaseFulfillmentHold(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    const holdId = requiredUuid(request.input, "holdId");
    const now = new Date().toISOString();
    const released = await this.connection.execute<{ id: string }>(sql`
      UPDATE orders.order_fulfillment_holds
      SET released_by_type = ${request.context.actor.type}, released_by_id = ${request.context.actor.id},
          released_at = ${now}, release_reason = 'ADMIN_RELEASE'
      WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillment.id}
        AND id = ${holdId} AND released_at IS NULL AND system_managed = false
      RETURNING id
    `);
    if (!released[0]) throw new Error("FULFILLMENT_HOLD_NOT_FOUND");
    const active = await this.connection.execute<{ found: boolean }>(sql`
      SELECT true AS found FROM orders.order_fulfillment_holds
      WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillment.id}
        AND released_at IS NULL LIMIT 1
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = ${active[0] ? "ON_HOLD" : "OPEN"}::orders.order_fulfillment_order_status,
          hold_reason = ${active[0] ? fulfillment.holdReason : null}, version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(request, order, command, { holdId }, now);
    return { ...result, resourceId: fulfillment.id };
  }

  public async createFulfillment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const fulfillmentOrder = await this.lockFulfillmentOrder(request);
    if (["CLOSED", "CANCELLED", "ON_HOLD"].includes(fulfillmentOrder.status)) {
      throw new Error("FULFILLMENT_CREATE_NOT_ALLOWED");
    }
    const placement = await this.connection.execute<{ status: string }>(sql`
      SELECT status FROM orders.order_checkout_placements
      WHERE store_id = ${request.context.storeId} AND order_id = ${fulfillmentOrder.orderId}
      LIMIT 1 FOR UPDATE
    `);
    if (placement[0] && placement[0].status !== "CONFIRMED") {
      throw new Error("ORDER_PLACEMENT_NOT_CONFIRMED");
    }
    const lines = requiredArray(request.input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("FULFILLMENT_LINES_REQUIRED");
    const fulfillmentId = await this.generateUuidV7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillments (
        id, store_id, order_id, fulfillment_order_id, status, idempotency_key,
        metadata, opened_at, completed_at, created_at, updated_at
      ) VALUES (
        ${fulfillmentId}, ${request.context.storeId}, ${fulfillmentOrder.orderId},
        ${fulfillmentOrder.id}, 'SUCCESS', ${requiredString(request.input, "idempotencyKey")},
        '{}'::jsonb, ${now}, ${now}, ${now}, ${now}
      )
    `);
    for (const line of lines) {
      const lineId = requiredUuid(line, "fulfillmentOrderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const allocation = await this.connection.execute<{
        quantity: number;
        fulfilled: number;
      }>(sql`
        SELECT allocation.quantity,
          COALESCE((
            SELECT sum(line.quantity)::integer
            FROM orders.order_fulfillment_lines line
            JOIN orders.order_fulfillments fulfillment
              ON fulfillment.store_id = line.store_id AND fulfillment.id = line.fulfillment_id
            WHERE line.store_id = allocation.store_id
              AND line.order_id = allocation.order_id
              AND line.order_line_id = allocation.order_line_id
              AND fulfillment.status = 'SUCCESS'
          ), 0) AS fulfilled
        FROM orders.order_fulfillment_order_lines allocation
        WHERE allocation.store_id = ${request.context.storeId}
          AND allocation.fulfillment_order_id = ${fulfillmentOrder.id}
          AND allocation.order_line_id = ${lineId}
        FOR UPDATE OF allocation
      `);
      if (!allocation[0] || quantity > allocation[0].quantity - allocation[0].fulfilled) {
        throw new Error("FULFILLMENT_QUANTITY_INVALID");
      }
      await this.connection.execute(sql`
        INSERT INTO orders.order_fulfillment_lines
          (store_id, order_id, fulfillment_id, order_line_id, quantity)
        VALUES (${request.context.storeId}, ${fulfillmentOrder.orderId}, ${fulfillmentId}, ${lineId}, ${quantity})
      `);
    }
    const remaining = await this.connection.execute<{ quantity: number }>(sql`
      SELECT COALESCE(sum(allocation.quantity), 0)::integer
        - COALESCE(sum(fulfilled.quantity), 0)::integer AS quantity
      FROM orders.order_fulfillment_order_lines allocation
      LEFT JOIN LATERAL (
        SELECT sum(line.quantity)::integer AS quantity
        FROM orders.order_fulfillment_lines line
        JOIN orders.order_fulfillments fulfillment
          ON fulfillment.store_id = line.store_id AND fulfillment.id = line.fulfillment_id
        WHERE line.store_id = allocation.store_id
          AND line.order_id = allocation.order_id
          AND line.order_line_id = allocation.order_line_id
          AND fulfillment.status = 'SUCCESS'
      ) fulfilled ON true
      WHERE allocation.store_id = ${request.context.storeId}
        AND allocation.fulfillment_order_id = ${fulfillmentOrder.id}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = ${(remaining[0]?.quantity ?? 0) === 0 ? "CLOSED" : "IN_PROGRESS"}::orders.order_fulfillment_order_status,
          closed_at = CASE WHEN ${(remaining[0]?.quantity ?? 0) === 0} THEN ${now}::timestamptz ELSE NULL END,
          version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillmentOrder.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillmentOrder.orderId);
    const aggregateRemaining = await this.connection.execute<{
      remaining: number;
      fulfilled: number;
    }>(sql`
      SELECT
        COALESCE(sum(line.quantity - line.cancelled_quantity), 0)::integer
          - COALESCE((
            SELECT sum(fulfilled_line.quantity)::integer
            FROM orders.order_fulfillment_lines fulfilled_line
            JOIN orders.order_fulfillments fulfillment
              ON fulfillment.store_id = fulfilled_line.store_id
             AND fulfillment.id = fulfilled_line.fulfillment_id
            WHERE fulfilled_line.store_id = ${request.context.storeId}
              AND fulfilled_line.order_id = ${order.id}
              AND fulfillment.status = 'SUCCESS'
          ), 0) AS remaining,
        COALESCE((
          SELECT sum(fulfilled_line.quantity)::integer
          FROM orders.order_fulfillment_lines fulfilled_line
          JOIN orders.order_fulfillments fulfillment
            ON fulfillment.store_id = fulfilled_line.store_id
           AND fulfillment.id = fulfilled_line.fulfillment_id
          WHERE fulfilled_line.store_id = ${request.context.storeId}
            AND fulfilled_line.order_id = ${order.id}
            AND fulfillment.status = 'SUCCESS'
        ), 0) AS fulfilled
      FROM orders.order_lines line
      WHERE line.store_id = ${request.context.storeId} AND line.order_id = ${order.id}
    `);
    const fulfillmentStatus =
      (aggregateRemaining[0]?.remaining ?? 0) === 0
        ? "FULFILLED"
        : (aggregateRemaining[0]?.fulfilled ?? 0) > 0
          ? "PARTIALLY_FULFILLED"
          : "UNFULFILLED";
    await this.connection.execute(sql`
      UPDATE orders.orders SET fulfillment_status = ${fulfillmentStatus}::orders.order_fulfillment_status,
        updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { fulfillmentId, fulfillmentOrderId: fulfillmentOrder.id, lines },
      now,
    );
    return { ...result, resourceId: fulfillmentId };
  }

  public async updateShipmentTracking(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const shipment = await this.lockShipment(request);
    if (shipment.externalId) throw new Error("PROVIDER_MANAGED_SHIPMENT_TRACKING_READ_ONLY");
    const tracking = requiredArray(request.input, "tracking").map(asRecord);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      DELETE FROM orders.order_shipment_tracking_numbers
      WHERE store_id = ${request.context.storeId} AND shipment_id = ${shipment.id}
    `);
    for (let index = 0; index < tracking.length; index += 1) {
      const item = tracking[index]!;
      await this.connection.execute(sql`
        INSERT INTO orders.order_shipment_tracking_numbers
          (store_id, order_id, shipment_id, number, url, company, is_primary, created_at)
        VALUES (${request.context.storeId}, ${shipment.orderId}, ${shipment.id},
          ${requiredString(item, "number")}, ${optionalString(item.url)}, ${optionalString(item.company)},
          ${index === 0}, ${now})
      `);
    }
    const order = await this.lockOrderById(request.context.storeId, shipment.orderId);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { shipmentId: shipment.id, tracking },
      now,
    );
    return { ...result, resourceId: shipment.id };
  }

  public async markShipment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    status: "IN_TRANSIT" | "DELIVERED",
  ): Promise<MutableAdminOrderCommandResult> {
    const shipment = await this.lockShipment(request);
    const timestamp = requiredDateTime(
      request.input,
      status === "DELIVERED" ? "deliveredAt" : "shippedAt",
    );
    await this.connection.execute(sql`
      UPDATE orders.order_shipments
      SET status = ${status}::orders.order_shipment_status,
          shipped_at = CASE WHEN ${status === "IN_TRANSIT"} THEN ${timestamp}::timestamptz ELSE shipped_at END,
          delivered_at = CASE WHEN ${status === "DELIVERED"} THEN ${timestamp}::timestamptz ELSE delivered_at END,
          updated_at = ${timestamp}
      WHERE store_id = ${request.context.storeId} AND id = ${shipment.id}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_shipment_tracking_events (
        store_id, order_id, shipment_id, status, message, happened_at
      ) VALUES (${request.context.storeId}, ${shipment.orderId}, ${shipment.id}, ${status},
        ${command}, ${timestamp})
    `);
    const order = await this.lockOrderById(request.context.storeId, shipment.orderId);
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET delivery_status = ${status}::orders.order_delivery_status, updated_at = ${timestamp}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { shipmentId: shipment.id },
      timestamp,
    );
    return { ...result, resourceId: shipment.id };
  }
}
