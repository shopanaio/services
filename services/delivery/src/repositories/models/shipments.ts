import { index, integer, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { Delivery } from "@shopana/broker-types";
import type { DeliveryDomainEvent, DeliveryProviderInboxRecord } from "../../contracts/ports.js";
import { deliverySchema } from "./schema.js";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
};

export const shipments = deliverySchema.table(
  "shipments",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id").notNull(),
    fulfillmentOrderId: uuid("fulfillment_order_id").notNull(),
    providerAccountId: uuid("provider_account_id").notNull(),
    providerShipmentReference: text("provider_shipment_reference"),
    state: text("state").notNull(),
    revision: integer("revision").notNull(),
    snapshot: jsonb("snapshot").$type<Delivery.DeliveryShipmentSnapshot>().notNull(),
    ...timestamps,
  },
  (table) => [
    index("shipments_store_order_idx").on(table.storeId, table.orderId),
    index("shipments_fulfillment_idx").on(table.storeId, table.fulfillmentOrderId),
    unique("shipments_provider_reference_key").on(
      table.storeId,
      table.providerAccountId,
      table.providerShipmentReference,
    ),
  ],
);

export const shipmentOperations = deliverySchema.table(
  "shipment_operations",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    shipmentId: uuid("shipment_id").notNull(),
    type: text("type").notNull(),
    state: text("state").notNull(),
    idempotencyScope: text("idempotency_scope").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    snapshot: jsonb("snapshot").$type<Delivery.DeliveryShipmentOperationSnapshot>().notNull(),
    ...timestamps,
  },
  (table) => [
    unique("shipment_operations_idempotency_key").on(
      table.storeId,
      table.idempotencyScope,
      table.idempotencyKey,
    ),
    index("shipment_operations_shipment_idx").on(table.storeId, table.shipmentId, table.createdAt),
  ],
);

export const shipmentTrackingEvents = deliverySchema.table(
  "shipment_tracking_events",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    shipmentId: uuid("shipment_id").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    snapshot: jsonb("snapshot").$type<Delivery.DeliveryTrackingEventSnapshot>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("shipment_tracking_events_provider_key").on(
      table.storeId,
      table.shipmentId,
      table.providerEventId,
    ),
    index("shipment_tracking_events_timeline_idx").on(
      table.storeId,
      table.shipmentId,
      table.occurredAt,
    ),
  ],
);

export const providerInbox = deliverySchema.table(
  "provider_inbox",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    providerAccountId: uuid("provider_account_id").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventHash: text("event_hash").notNull(),
    payload: jsonb("payload").$type<DeliveryProviderInboxRecord>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("provider_inbox_event_key").on(
      table.storeId,
      table.providerAccountId,
      table.providerEventId,
    ),
  ],
);

export const deliveryMutations = deliverySchema.table(
  "shipment_mutations",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    shipmentId: uuid("shipment_id").notNull(),
    idempotencyScope: text("idempotency_scope").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    shipmentRevision: integer("shipment_revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("shipment_mutations_idempotency_key").on(
      table.storeId,
      table.idempotencyScope,
      table.idempotencyKey,
    ),
  ],
);

export const deliveryOutbox = deliverySchema.table(
  "shipment_outbox",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    shipmentId: uuid("shipment_id").notNull(),
    eventType: text("event_type").notNull(),
    event: jsonb("event").$type<DeliveryDomainEvent>().notNull(),
    emittedAt: timestamp("emitted_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shipment_outbox_pending_idx").on(table.emittedAt, table.createdAt)],
);
