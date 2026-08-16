import { index, integer, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { Delivery } from "@shopana/broker-types";
import { ordersSchema } from "./schema.js";

export interface OrderDeliveryFulfillmentPayload {
  snapshot: Delivery.DeliveryFulfillmentOrderSnapshot;
  source: Delivery.DeliveryCommittedGroupSnapshot;
}

export const deliveryFulfillmentSnapshots = ordersSchema.table("delivery_fulfillment_snapshots", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  checkoutId: uuid("checkout_id").notNull(),
  deliveryGroupId: text("delivery_group_id").notNull(),
  revision: integer("revision").notNull(),
  status: text("status").notNull(),
  requestStatus: text("request_status").notNull(),
  payload: jsonb("payload").$type<OrderDeliveryFulfillmentPayload>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => [
  unique("delivery_fulfillment_snapshots_group_key").on(table.storeId, table.orderId, table.deliveryGroupId),
  index("delivery_fulfillment_snapshots_order_idx").on(table.storeId, table.orderId),
  index("delivery_fulfillment_snapshots_status_idx").on(table.storeId, table.status, table.updatedAt),
]);

export const deliveryFulfillmentUpdates = ordersSchema.table("delivery_fulfillment_updates", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  fulfillmentOrderId: uuid("fulfillment_order_id").notNull(),
  shipmentId: uuid("shipment_id").notNull(),
  shipmentRevision: integer("shipment_revision").notNull(),
  state: text("state").notNull(),
  requestHash: text("request_hash").notNull(),
  payload: jsonb("payload").$type<Delivery.DeliveryFulfillmentShipmentUpdate>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  unique("delivery_fulfillment_updates_shipment_revision_key").on(table.storeId, table.shipmentId, table.shipmentRevision),
  index("delivery_fulfillment_updates_fulfillment_idx").on(table.storeId, table.fulfillmentOrderId, table.createdAt),
]);
