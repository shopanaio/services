import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Delivery, Orders } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  orderFulfillmentOrders,
  orderFulfillmentEventInbox,
  type OrderDeliveryFulfillmentPayload,
} from "../models/index.js";

export class DeliveryFulfillmentRepository extends BaseRepository {
  async listForOrder(
    params: Orders.ListOrderDeliveryFulfillmentOrdersParams,
  ): Promise<Orders.ListOrderDeliveryFulfillmentOrdersResult> {
    const rows = await this.connection
      .select({ payload: orderFulfillmentOrders.payload })
      .from(orderFulfillmentOrders)
      .where(
        and(
          eq(orderFulfillmentOrders.storeId, params.storeId),
          eq(orderFulfillmentOrders.orderId, params.orderId),
        ),
      )
      .orderBy(asc(orderFulfillmentOrders.createdAt));
    return { fulfillmentOrders: rows.map(({ payload }) => payload.snapshot) };
  }

  async createForOrder(input: {
    organizationId: string;
    storeId: string;
    orderId: string;
    checkoutId: string;
    commitments: readonly Delivery.DeliveryCommittedGroupSnapshot[];
    createdAt: string;
  }): Promise<void> {
    for (const source of input.commitments) {
      const existing = await this.getByOrderGroup(input.storeId, input.orderId, source.groupId);
      if (existing) continue;
      const fulfillmentOrderId = await this.generateUuidV7();
      const itemByLine = new Map<string, Delivery.DeliveryFulfillmentOrderLineItemSnapshot>();
      for (const item of source.packages.flatMap(({ items }) => items)) {
        const prior = itemByLine.get(item.lineId);
        if (prior && prior.variantId !== item.variantId)
          throw new Error("ORDER_FULFILLMENT_LINE_VARIANT_CONFLICT");
        const quantity = (prior?.quantity ?? 0) + item.quantity;
        itemByLine.set(item.lineId, {
          fulfillmentOrderLineItemId: item.lineId,
          orderLineId: item.lineId,
          checkoutLineId: item.lineId,
          variantId: item.variantId,
          quantity,
          remainingQuantity: quantity,
          requiresShipping: true,
        });
      }
      const items = [...itemByLine.values()];
      if (items.length === 0) throw new Error("ORDER_FULFILLMENT_LINES_REQUIRED");
      const snapshot: Delivery.DeliveryFulfillmentOrderSnapshot = {
        fulfillmentOrderId,
        revision: 1,
        organizationId: input.organizationId,
        storeId: input.storeId,
        orderId: input.orderId,
        checkoutId: input.checkoutId,
        deliveryGroupId: source.groupId,
        status: "OPEN",
        requestStatus: "UNSUBMITTED",
        supportedActions: ["CREATE_SHIPMENT", "HOLD", "MOVE", "CLOSE", "MARK_INCOMPLETE"],
        assignedLocation: {
          locationId: source.origin.fulfillmentLocationId,
          management: "MERCHANT",
          fulfillmentService: null,
        },
        holds: [],
        deliveryMethod: source.deliveryMethod,
        lineItems: items as [
          Delivery.DeliveryFulfillmentOrderLineItemSnapshot,
          ...Delivery.DeliveryFulfillmentOrderLineItemSnapshot[],
        ],
        fulfillAt: null,
        fulfillBy: source.deliveryMethod.estimatedMaxDeliveryAt,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      };
      const payload: OrderDeliveryFulfillmentPayload = { snapshot, source };
      await this.connection.insert(orderFulfillmentOrders).values({
        id: fulfillmentOrderId,
        storeId: input.storeId,
        orderId: input.orderId,
        deliveryGroupId: source.groupId,
        status: snapshot.status,
        requestStatus: snapshot.requestStatus,
        payload,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      });
    }
  }

  async getShipmentPlan(
    params: Orders.GetOrderDeliveryShipmentPlanParams,
  ): Promise<Orders.GetOrderDeliveryShipmentPlanResult> {
    const row = await this.getRow(params.storeId, params.fulfillmentOrderId);
    if (!row) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
    const { snapshot, source } = row.payload;
    if (snapshot.status === "SCHEDULED")
      return notReady(
        "SCHEDULED",
        snapshot,
        "FULFILLMENT_ORDER_SCHEDULED",
        "The fulfillment order is scheduled for later.",
      );
    if (snapshot.status === "ON_HOLD")
      return notReady(
        "ON_HOLD",
        snapshot,
        "FULFILLMENT_ORDER_ON_HOLD",
        "The fulfillment order is on hold.",
      );
    if (snapshot.status === "CLOSED" || snapshot.status === "CANCELLED")
      return notReady(
        "CLOSED",
        snapshot,
        "FULFILLMENT_ORDER_CLOSED",
        "The fulfillment order is closed.",
      );
    if (
      snapshot.assignedLocation.management === "FULFILLMENT_SERVICE" &&
      !["ACCEPTED", "CANCELLATION_REJECTED"].includes(snapshot.requestStatus)
    ) {
      return notReady(
        "FULFILLMENT_REQUEST_NOT_ACCEPTED",
        snapshot,
        "FULFILLMENT_REQUEST_NOT_ACCEPTED",
        "The fulfillment service has not accepted this request.",
      );
    }
    const available = new Map(
      snapshot.lineItems.map((line) => [line.fulfillmentOrderLineItemId, line]),
    );
    const selected =
      params.lineItems ??
      snapshot.lineItems
        .filter(
          ({ requiresShipping, remainingQuantity }) => requiresShipping && remainingQuantity > 0,
        )
        .map(({ fulfillmentOrderLineItemId, remainingQuantity }) => ({
          fulfillmentOrderLineItemId,
          quantity: remainingQuantity,
        }));
    if (
      selected.length === 0 ||
      selected.some((entry) => {
        const line = available.get(entry.fulfillmentOrderLineItemId);
        return (
          !line ||
          !line.requiresShipping ||
          entry.quantity <= 0 ||
          entry.quantity > line.remainingQuantity
        );
      })
    )
      return notReady(
        "INVALID_LINE_ITEMS",
        snapshot,
        "FULFILLMENT_LINE_ITEMS_INVALID",
        "The requested shipment quantities are unavailable.",
      );
    const quantityByLine = new Map(
      selected.map(({ fulfillmentOrderLineItemId, quantity }) => [
        fulfillmentOrderLineItemId,
        quantity,
      ]),
    );
    const packages = source.packages.flatMap((sourcePackage) => {
      const items = sourcePackage.items.flatMap((item) => {
        const remaining = quantityByLine.get(item.lineId) ?? 0;
        const quantity = Math.min(remaining, item.quantity);
        if (quantity <= 0) return [];
        quantityByLine.set(item.lineId, remaining - quantity);
        return [{ ...item, quantity }];
      });
      if (items.length === 0) return [];
      const weightGrams = items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
      const amountMinor = items
        .reduce(
          (sum, item) => sum + BigInt(item.unitDeclaredValue.amountMinor) * BigInt(item.quantity),
          0n,
        )
        .toString();
      return [
        {
          ...sourcePackage,
          packageId: digest("ofpkg_v1", [sourcePackage.packageId, items]),
          items,
          weightGrams,
          declaredValue: { ...sourcePackage.declaredValue, amountMinor },
        },
      ];
    });
    if ([...quantityByLine.values()].some((quantity) => quantity !== 0))
      return notReady(
        "INVALID_LINE_ITEMS",
        snapshot,
        "FULFILLMENT_PACKAGE_QUANTITY_INVALID",
        "The requested quantity cannot be mapped to committed packages.",
      );
    if (packages.length === 0)
      return notReady(
        "NO_SHIPPING_REQUIRED",
        snapshot,
        "FULFILLMENT_NO_PACKAGES",
        "No physical package can be produced.",
      );
    const planWithoutHash = {
      fulfillmentOrder: snapshot,
      lineItems: selected,
      shipmentProvider: source.shipmentProvider,
      origin: source.origin,
      destination: source.destination,
      sender: source.sender,
      recipient: source.recipient,
      packages,
    };
    return {
      status: "READY",
      plan: {
        ...planWithoutHash,
        lineItems: selected as [
          Delivery.DeliveryFulfillmentOrderLineItemInput,
          ...Delivery.DeliveryFulfillmentOrderLineItemInput[],
        ],
        packages: packages as unknown as [
          Delivery.DeliveryProviderPackage,
          ...Delivery.DeliveryProviderPackage[],
        ],
        planHash: digest("osplan_v1", planWithoutHash),
      },
    };
  }

  async applyShipmentUpdate(
    params: Orders.ApplyOrderDeliveryShipmentUpdateParams,
  ): Promise<Orders.ApplyOrderDeliveryShipmentUpdateResult> {
    return this.txManager.run(async () => {
      const [row] = await this.connection
        .select()
        .from(orderFulfillmentOrders)
        .where(
          and(
            eq(orderFulfillmentOrders.storeId, params.storeId),
            eq(orderFulfillmentOrders.id, params.update.fulfillmentOrderId),
          ),
        )
        .limit(1)
        .for("update");
      if (!row) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
      const requestHash = digest("ofupdate_v1", params.update);
      const [existing] = await this.connection
        .select()
        .from(orderFulfillmentEventInbox)
        .where(
          and(
            eq(orderFulfillmentEventInbox.storeId, params.storeId),
            eq(orderFulfillmentEventInbox.shipmentId, params.update.shipmentId),
            eq(orderFulfillmentEventInbox.shipmentRevision, params.update.shipmentRevision),
          ),
        )
        .limit(1);
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new Error("FULFILLMENT_SHIPMENT_UPDATE_CONFLICT");
        return { status: "DUPLICATE", fulfillmentOrderRevision: row.payload.snapshot.revision };
      }
      const payload = row.payload;
      let lineItems = [...payload.snapshot.lineItems];
      const history = await this.connection
        .select()
        .from(orderFulfillmentEventInbox)
        .where(
          and(
            eq(orderFulfillmentEventInbox.storeId, params.storeId),
            eq(orderFulfillmentEventInbox.fulfillmentOrderId, row.id),
          ),
        )
        .orderBy(
          asc(orderFulfillmentEventInbox.createdAt),
          asc(orderFulfillmentEventInbox.shipmentRevision),
        );
      if (params.update.state === "SHIPMENT_CREATED")
        lineItems = allocate(lineItems, params.update.lineItems, -1);
      if (params.update.state === "CANCELLED") {
        const prior = history.filter(({ shipmentId }) => shipmentId === params.update.shipmentId);
        if (
          prior.some(({ state }) => state === "SHIPMENT_CREATED") &&
          !prior.some(({ state }) => state === "CANCELLED")
        )
          lineItems = allocate(lineItems, params.update.lineItems, 1);
      }
      const nextRevision = row.payload.snapshot.revision + 1;
      const remaining = lineItems.reduce((sum, line) => sum + line.remainingQuantity, 0);
      const latestState = new Map(history.map(({ shipmentId, state }) => [shipmentId, state]));
      latestState.set(params.update.shipmentId, params.update.state);
      const activeShipmentIds = new Set(
        history
          .filter(({ state }) => state === "SHIPMENT_CREATED")
          .map(({ shipmentId }) => shipmentId),
      );
      if (params.update.state === "SHIPMENT_CREATED")
        activeShipmentIds.add(params.update.shipmentId);
      const allActiveShipmentsDelivered = [...activeShipmentIds].every(
        (shipmentId) =>
          latestState.get(shipmentId) === "DELIVERED" ||
          latestState.get(shipmentId) === "CANCELLED",
      );
      const status: Delivery.DeliveryFulfillmentOrderStatus =
        remaining === 0 && allActiveShipmentsDelivered
          ? "CLOSED"
          : params.update.state === "DELIVERY_FAILED"
            ? "INCOMPLETE"
            : params.update.state === "CANCELLED" && remaining > 0
              ? "OPEN"
              : "IN_PROGRESS";
      const snapshot: Delivery.DeliveryFulfillmentOrderSnapshot = {
        ...payload.snapshot,
        revision: nextRevision,
        status,
        supportedActions: status === "CLOSED" ? [] : payload.snapshot.supportedActions,
        lineItems: lineItems as [
          Delivery.DeliveryFulfillmentOrderLineItemSnapshot,
          ...Delivery.DeliveryFulfillmentOrderLineItemSnapshot[],
        ],
        updatedAt: params.update.occurredAt,
      };
      await this.connection
        .update(orderFulfillmentOrders)
        .set({
          status,
          payload: { ...payload, snapshot },
          updatedAt: params.update.occurredAt,
        })
        .where(eq(orderFulfillmentOrders.id, row.id));
      await this.connection.insert(orderFulfillmentEventInbox).values({
        id: await this.generateUuidV7(),
        storeId: params.storeId,
        orderId: row.orderId,
        providerCode: "delivery",
        fulfillmentOrderId: row.id,
        shipmentId: params.update.shipmentId,
        shipmentRevision: params.update.shipmentRevision,
        state: params.update.state,
        requestHash,
        payload: params.update,
        createdAt: params.update.occurredAt,
      });
      await this.applyOrderProjectionAndAudit(params.storeId, row.orderId, params.update);
      return { status: "APPLIED", fulfillmentOrderRevision: nextRevision };
    });
  }

  private async applyOrderProjectionAndAudit(
    storeId: string,
    orderId: string,
    update: Delivery.DeliveryFulfillmentShipmentUpdate,
  ): Promise<void> {
    const shipmentStatus =
      update.state === "SHIPMENT_CREATED"
        ? "LABEL_CREATED"
        : update.state === "DELIVERY_FAILED"
          ? "EXCEPTION"
          : update.state;
    await this.connection.execute(sql`
      UPDATE orders.order_shipments
      SET status = ${shipmentStatus}::orders.order_shipment_status,
        shipped_at = CASE WHEN ${update.state === "IN_TRANSIT"}
          THEN COALESCE(shipped_at, ${update.occurredAt}::timestamptz) ELSE shipped_at END,
        delivered_at = CASE WHEN ${update.state === "DELIVERED"}
          THEN ${update.occurredAt}::timestamptz ELSE delivered_at END,
        metadata = jsonb_set(metadata, '{providerRevision}', to_jsonb(${update.shipmentRevision}), true),
        updated_at = ${update.occurredAt}
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND external_id = ${update.shipmentId}
    `);
    const updated = await this.connection.execute<{ id: string }>(sql`
      WITH fulfillment AS (
        SELECT count(*)::integer AS total,
          count(*) FILTER (WHERE status = 'CLOSED')::integer AS closed,
          count(*) FILTER (WHERE status IN ('IN_PROGRESS', 'INCOMPLETE'))::integer AS active
        FROM orders.order_fulfillment_orders
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ), shipment AS (
        SELECT count(*) FILTER (WHERE status <> 'CANCELLED')::integer AS total,
          count(*) FILTER (WHERE status = 'DELIVERED')::integer AS delivered,
          count(*) FILTER (WHERE status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY'))::integer AS moving,
          count(*) FILTER (WHERE status IN ('SHIPPED', 'LABEL_CREATED'))::integer AS shipped,
          count(*) FILTER (WHERE status IN ('EXCEPTION', 'DELIVERY_ATTEMPTED', 'DELAYED'))::integer AS failed
        FROM orders.order_shipments
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      )
      UPDATE orders.orders current_order
      SET fulfillment_status = CASE
          WHEN fulfillment.total > 0 AND fulfillment.closed = fulfillment.total THEN 'FULFILLED'
          WHEN fulfillment.active > 0 OR fulfillment.closed > 0 THEN 'PARTIALLY_FULFILLED'
          ELSE current_order.fulfillment_status
        END::orders.order_fulfillment_status,
        delivery_status = CASE
          WHEN shipment.total > 0 AND shipment.delivered = shipment.total THEN 'DELIVERED'
          WHEN shipment.delivered > 0 THEN 'PARTIALLY_SHIPPED'
          WHEN shipment.failed > 0 THEN 'EXCEPTION'
          WHEN shipment.moving > 0 THEN 'IN_TRANSIT'
          WHEN shipment.shipped > 0 THEN 'SHIPPED'
          ELSE current_order.delivery_status
        END::orders.order_delivery_status,
        updated_at = GREATEST(updated_at, ${update.occurredAt}::timestamptz)
      FROM fulfillment, shipment
      WHERE current_order.store_id = ${storeId} AND current_order.id = ${orderId}
      RETURNING current_order.id
    `);
    if (!updated[0]) throw new Error("ORDER_NOT_FOUND");
    const eventType = `delivery.shipment.${update.state.toLowerCase()}`;
    const idempotencyKey = `delivery:${update.shipmentId}:${update.shipmentRevision}`;
    const payload = JSON.stringify({
      shipmentId: update.shipmentId,
      shipmentRevision: update.shipmentRevision,
      fulfillmentOrderId: update.fulfillmentOrderId,
      state: update.state,
      lineItems: update.lineItems,
    });
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, visibility, actor_type,
        idempotency_key, payload, happened_at
      ) VALUES (
        ${storeId}, ${orderId}, ${eventType}, 'INTERNAL', 'SYSTEM',
        ${idempotencyKey}, ${payload}::jsonb, ${update.occurredAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_status_history (
        store_id, order_id, order_status, payment_status,
        fulfillment_status, delivery_status, return_status, reason_code,
        actor_type, metadata, happened_at
      ) SELECT store_id, id, status, payment_status, fulfillment_status,
        delivery_status, return_status, ${eventType}, 'SYSTEM', ${payload}::jsonb,
        ${update.occurredAt}
      FROM orders.orders
      WHERE store_id = ${storeId} AND id = ${orderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        store_id, order_id, activity_type, visibility, actor_type,
        payload, happened_at
      ) VALUES (
        ${storeId}, ${orderId}, ${eventType}, 'INTERNAL', 'SYSTEM',
        ${payload}::jsonb, ${update.occurredAt}
      )
    `);
  }

  private async getRow(storeId: string, fulfillmentOrderId: string) {
    return (
      (
        await this.connection
          .select()
          .from(orderFulfillmentOrders)
          .where(
            and(
              eq(orderFulfillmentOrders.storeId, storeId),
              eq(orderFulfillmentOrders.id, fulfillmentOrderId),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  }

  private async getByOrderGroup(storeId: string, orderId: string, groupId: string) {
    return (
      (
        await this.connection
          .select()
          .from(orderFulfillmentOrders)
          .where(
            and(
              eq(orderFulfillmentOrders.storeId, storeId),
              eq(orderFulfillmentOrders.orderId, orderId),
              eq(orderFulfillmentOrders.deliveryGroupId, groupId),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  }
}

function allocate(
  lines: readonly Delivery.DeliveryFulfillmentOrderLineItemSnapshot[],
  allocations: readonly Delivery.DeliveryFulfillmentOrderLineItemInput[],
  direction: -1 | 1,
) {
  const amounts = new Map(
    allocations.map(({ fulfillmentOrderLineItemId, quantity }) => [
      fulfillmentOrderLineItemId,
      quantity,
    ]),
  );
  return lines.map((line) => {
    const quantity = amounts.get(line.fulfillmentOrderLineItemId) ?? 0;
    const remainingQuantity = line.remainingQuantity + direction * quantity;
    if (remainingQuantity < 0 || remainingQuantity > line.quantity)
      throw new Error("FULFILLMENT_ALLOCATION_INVALID");
    return { ...line, remainingQuantity };
  });
}

function notReady(
  reason: Exclude<Delivery.DeliveryShipmentPlanAvailability, { status: "READY" }>["reason"],
  snapshot: Delivery.DeliveryFulfillmentOrderSnapshot,
  code: string,
  message: string,
): Delivery.DeliveryShipmentPlanAvailability {
  return { status: "NOT_READY", reason, code, message, currentRevision: snapshot.revision };
}

function digest(prefix: string, value: unknown): string {
  return `${prefix}_${createHash("sha256").update(canonicalJson(value)).digest("base64url")}`;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortCanonical(value));
}

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortCanonical(child)]),
    );
  }
  return value;
}
