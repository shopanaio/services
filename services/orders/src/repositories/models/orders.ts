import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ordersSchema } from "./schema.js";

const auditColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = ordersSchema.table(
  "orders",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    orderNumber: bigint("order_number", { mode: "bigint" }).notNull(),
    apiKeyId: uuid("api_key_id"),
    userId: uuid("user_id"),
    salesChannel: varchar("sales_channel", { length: 32 }),
    externalSource: text("external_source"),
    externalId: text("external_id"),
    localeCode: varchar("locale_code", { length: 16 }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    subtotal: bigint("subtotal", { mode: "bigint" }).notNull(),
    shippingTotal: bigint("shipping_total", { mode: "bigint" }).notNull(),
    discountTotal: bigint("discount_total", { mode: "bigint" }).notNull(),
    taxTotal: bigint("tax_total", { mode: "bigint" }).notNull(),
    grandTotal: bigint("grand_total", { mode: "bigint" }).notNull(),
    status: varchar("status", { length: 255 }).notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    checkoutSnapshot: jsonb("checkout_snapshot").$type<Record<string, unknown>>().notNull(),
    ...auditColumns(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("orders_store_number_unique").on(table.storeId, table.orderNumber),
    index("orders_store_created_at_idx").on(table.storeId, table.createdAt),
  ],
);

export const orderNumberCounters = ordersSchema.table("order_number_counters", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull().unique(),
  lastNumber: bigint("last_number", { mode: "bigint" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = ordersSchema.table(
  "order_items",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    subtotalAmount: bigint("subtotal_amount", { mode: "bigint" }).notNull(),
    discountAmount: bigint("discount_amount", { mode: "bigint" }).notNull(),
    taxAmount: bigint("tax_amount", { mode: "bigint" }).notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    unitId: text("unit_id"),
    unitTitle: text("unit_title"),
    unitPrice: bigint("unit_price", { mode: "bigint" }),
    unitCompareAtPrice: bigint("unit_compare_at_price", { mode: "bigint" }),
    unitSku: text("unit_sku"),
    unitImageUrl: text("unit_image_url"),
    unitSnapshot: jsonb("unit_snapshot").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const orderDeliveryAddresses = ordersSchema.table("order_delivery_addresses", {
  id: uuid("id").primaryKey(),
  address1: text("address1"),
  address2: text("address2"),
  city: text("city"),
  countryCode: varchar("country_code", { length: 2 }),
  provinceCode: text("province_code"),
  postalCode: text("postal_code"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...auditColumns(),
});

export const orderRecipients = ordersSchema.table(
  "order_recipients",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    middleName: text("middle_name"),
    email: text("email"),
    phone: text("phone"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns(),
  },
  (table) => [index("order_recipients_store_id_idx").on(table.storeId)],
);

export const ordersPiiRecords = ordersSchema.table(
  "orders_pii_records",
  {
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id")
      .primaryKey()
      .references(() => orders.id, { onDelete: "cascade" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    middleName: text("middle_name"),
    customerId: uuid("customer_id"),
    customerEmail: text("customer_email"),
    customerPhoneE164: text("customer_phone_e164"),
    customerNote: text("customer_note"),
    countryCode: varchar("country_code", { length: 2 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [index("orders_pii_records_store_id_idx").on(table.storeId)],
);

export const orderDeliveryGroups = ordersSchema.table(
  "order_delivery_groups",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    addressId: uuid("address_id").references(() => orderDeliveryAddresses.id, {
      onDelete: "set null",
    }),
    recipientId: uuid("recipient_id").references(() => orderRecipients.id, {
      onDelete: "set null",
    }),
    selectedDeliveryMethodCode: text("selected_delivery_method_code"),
    selectedDeliveryMethodProvider: text("selected_delivery_method_provider"),
    lineItemIds: uuid("line_item_ids").array().notNull(),
    ...auditColumns(),
  },
  (table) => [index("order_delivery_groups_order_id_idx").on(table.orderId)],
);

export const orderDeliveryMethods = ordersSchema.table(
  "order_delivery_methods",
  {
    code: text("code").notNull(),
    provider: text("provider").notNull(),
    storeId: uuid("store_id").notNull(),
    deliveryGroupId: uuid("delivery_group_id")
      .notNull()
      .references(() => orderDeliveryGroups.id, { onDelete: "cascade" }),
    deliveryMethodType: varchar("delivery_method_type", { length: 32 }),
    paymentModel: varchar("payment_model", { length: 32 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    customerInput: jsonb("customer_input").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [primaryKey({ columns: [table.code, table.provider, table.deliveryGroupId] })],
);

export const orderPaymentMethods = ordersSchema.table(
  "order_payment_methods",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    billingAddressId: uuid("billing_address_id"),
    code: text("code").notNull(),
    provider: text("provider").notNull(),
    title: text("title"),
    flow: varchar("flow", { length: 32 }).notNull(),
    isSelected: boolean("is_selected").notNull().default(false),
    providerData: jsonb("provider_data").$type<Record<string, unknown>>().notNull().default({}),
    customerInputSnapshot: jsonb("customer_input_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ...auditColumns(),
  },
  (table) => [
    index("order_payment_methods_store_order_idx").on(table.storeId, table.orderId, table.id),
  ],
);

export const orderAppliedDiscounts = ordersSchema.table(
  "order_applied_discounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    code: text("code"),
    discountType: varchar("discount_type", { length: 32 }),
    value: bigint("value", { mode: "bigint" }).notNull(),
    provider: text("provider"),
    conditions: jsonb("conditions").$type<Record<string, unknown> | null>(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (table) => [index("order_applied_discounts_order_id_idx").on(table.orderId)],
);

export const idempotency = ordersSchema.table(
  "idempotency",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response").$type<{ id: string }>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("orders_idempotency_store_key_unique").on(table.storeId, table.idempotencyKey),
    index("orders_idempotency_expires_at_idx").on(table.expiresAt),
  ],
);
