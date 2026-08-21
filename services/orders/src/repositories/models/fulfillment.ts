import type { Delivery } from "@shopana/broker-types";
import {
  bigint,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { ordersSchema } from "./schema.js";

export interface OrderDeliveryFulfillmentPayload {
  snapshot: Delivery.DeliveryFulfillmentOrderSnapshot;
  source: Delivery.DeliveryCommittedGroupSnapshot;
}

export const orderFulfillmentOrders = ordersSchema.table("order_fulfillment_orders", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  deliveryGroupId: uuid("delivery_group_id"),
  status: text("status").notNull(),
  requestStatus: text("request_status").notNull(),
  assignedLocationId: uuid("assigned_location_id"),
  holdReason: text("hold_reason"),
  externalSource: varchar("external_source", { length: 128 }),
  externalId: text("external_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  payload: jsonb("provider_snapshot").$type<OrderDeliveryFulfillmentPayload>().notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
  closedAt: timestamp("closed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const orderFulfillmentEventInbox = ordersSchema.table(
  "order_fulfillment_event_inbox",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id").notNull(),
    providerCode: varchar("provider_code", { length: 128 }).notNull(),
    fulfillmentOrderId: text("provider_resource_id").notNull(),
    shipmentId: text("provider_event_id").notNull(),
    shipmentRevision: bigint("provider_sequence", { mode: "number" }),
    state: varchar("event_type", { length: 128 }).notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    status: text("status").notNull().default("RECEIVED"),
    payload: jsonb("payload").$type<Delivery.DeliveryFulfillmentShipmentUpdate>().notNull(),
    createdAt: timestamp("received_at", { withTimezone: true, mode: "string" }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
    failureCode: text("failure_code"),
  },
  (table) => [
    unique("order_fulfillment_event_inbox_event_unique").on(
      table.storeId,
      table.providerCode,
      table.shipmentId,
    ),
    index("order_fulfillment_event_inbox_pending_idx").on(table.createdAt, table.id),
  ],
);
