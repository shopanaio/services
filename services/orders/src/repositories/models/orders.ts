import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { ordersSchema } from "./schema.js";

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
const money = (name: string) => bigint(name, { mode: "bigint" });
const record = (name: string) => jsonb(name).$type<Record<string, unknown>>();

export const orders = ordersSchema.table(
  "orders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    orderNumber: money("order_number").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("DRAFT"),
    paymentStatus: text("payment_status").notNull().default("PENDING"),
    fulfillmentStatus: text("fulfillment_status").notNull().default("UNFULFILLED"),
    deliveryStatus: text("delivery_status").notNull().default("NOT_SHIPPED"),
    returnStatus: text("return_status").notNull().default("NONE"),
    riskLevel: text("risk_level").notNull().default("NONE"),
    origin: text("origin").notNull(),
    customerId: uuid("customer_id"),
    createdByType: text("created_by_type").notNull(),
    createdById: uuid("created_by_id"),
    salesChannel: varchar("sales_channel", { length: 64 }),
    checkoutId: uuid("checkout_id"),
    externalSource: varchar("external_source", { length: 128 }),
    externalId: text("external_id"),
    localeCode: varchar("locale_code", { length: 16 }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    subtotalAmount: money("subtotal_amount").notNull(),
    discountAmount: money("discount_amount").notNull().default(0n),
    shippingAmount: money("shipping_amount").notNull().default(0n),
    taxAmount: money("tax_amount").notNull().default(0n),
    dutyAmount: money("duty_amount").notNull().default(0n),
    adjustmentAmount: money("adjustment_amount").notNull().default(0n),
    totalAmount: money("total_amount").notNull(),
    checkoutSnapshot: record("checkout_snapshot").notNull(),
    metadata: record("metadata").notNull().default({}),
    placedAt: instant("placed_at"),
    cancelledAt: instant("cancelled_at"),
    closedAt: instant("closed_at"),
    expiresAt: instant("expires_at"),
    archivedAt: instant("archived_at"),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("orders_store_id_id_unique").on(table.storeId, table.id),
    unique("orders_store_number_unique").on(table.storeId, table.orderNumber),
  ],
);

export const orderNumberCounters = ordersSchema.table("order_number_counters", {
  storeId: uuid("store_id").primaryKey(),
  lastNumber: money("last_number").notNull().default(0n),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderLines = ordersSchema.table("order_lines", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  parentLineId: uuid("parent_line_id"),
  purchasableId: text("purchasable_id").notNull(),
  purchasableType: varchar("purchasable_type", { length: 64 }).notNull().default("VARIANT"),
  title: text("title").notNull(),
  sku: text("sku"),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull(),
  cancelledQuantity: integer("cancelled_quantity").notNull().default(0),
  requiresShipping: boolean("requires_shipping").notNull().default(true),
  taxable: boolean("taxable").notNull().default(true),
  unitPriceAmount: money("unit_price_amount").notNull(),
  unitCompareAtPriceAmount: money("unit_compare_at_price_amount"),
  subtotalAmount: money("subtotal_amount").notNull(),
  discountAmount: money("discount_amount").notNull().default(0n),
  taxAmount: money("tax_amount").notNull().default(0n),
  dutyAmount: money("duty_amount").notNull().default(0n),
  totalAmount: money("total_amount").notNull(),
  purchasableSnapshot: record("purchasable_snapshot").notNull(),
  metadata: record("metadata").notNull().default({}),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderContacts = ordersSchema.table(
  "order_contacts",
  {
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id").notNull(),
    type: text("type").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    middleName: text("middle_name"),
    email: text("email"),
    phoneE164: text("phone_e164"),
    customerNote: text("customer_note"),
    countryCode: varchar("country_code", { length: 2 }),
    emailHash: text("email_hash"),
    phoneHash: text("phone_hash"),
    metadata: record("metadata").notNull().default({}),
    expiresAt: instant("expires_at"),
    redactedAt: instant("redacted_at"),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.storeId, table.orderId] })],
);

export const orderAddresses = ordersSchema.table("order_addresses", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  type: text("type").notNull(),
  address1: text("address1"),
  address2: text("address2"),
  city: text("city"),
  countryCode: varchar("country_code", { length: 2 }),
  provinceCode: text("province_code"),
  postalCode: text("postal_code"),
  company: text("company"),
  metadata: record("metadata").notNull().default({}),
  expiresAt: instant("expires_at"),
  redactedAt: instant("redacted_at"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderRecipients = ordersSchema.table("order_recipients", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  middleName: text("middle_name"),
  email: text("email"),
  phone: text("phone"),
  metadata: record("metadata").notNull().default({}),
  expiresAt: instant("expires_at"),
  redactedAt: instant("redacted_at"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderDeliveryGroups = ordersSchema.table("order_delivery_groups", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  status: text("status").notNull().default("OPEN"),
  addressId: uuid("address_id"),
  recipientId: uuid("recipient_id"),
  requiresShipping: boolean("requires_shipping").notNull().default(true),
  subtotalAmount: money("subtotal_amount").notNull().default(0n),
  discountAmount: money("discount_amount").notNull().default(0n),
  taxAmount: money("tax_amount").notNull().default(0n),
  totalAmount: money("total_amount").notNull().default(0n),
  metadata: record("metadata").notNull().default({}),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderDeliveryGroupLines = ordersSchema.table(
  "order_delivery_group_lines",
  {
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id").notNull(),
    deliveryGroupId: uuid("delivery_group_id").notNull(),
    orderLineId: uuid("order_line_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.storeId, table.orderId, table.deliveryGroupId, table.orderLineId],
    }),
  ],
);

export const orderDeliveryMethods = ordersSchema.table("order_delivery_methods", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  deliveryGroupId: uuid("delivery_group_id").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  code: text("code").notNull(),
  provider: text("provider").notNull(),
  title: text("title"),
  type: text("type").notNull(),
  paymentModel: text("payment_model"),
  quotedAmount: money("quoted_amount").notNull().default(0n),
  isSelected: boolean("is_selected").notNull().default(false),
  providerData: record("provider_data").notNull().default({}),
  customerInputSnapshot: record("customer_input_snapshot").notNull().default({}),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderPaymentMethods = ordersSchema.table("order_payment_methods", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  billingAddressId: uuid("billing_address_id"),
  code: text("code").notNull(),
  provider: text("provider").notNull(),
  title: text("title"),
  flow: text("flow").notNull(),
  isSelected: boolean("is_selected").notNull().default(false),
  providerData: record("provider_data").notNull().default({}),
  customerInputSnapshot: record("customer_input_snapshot").notNull().default({}),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});

export const orderDiscountApplications = ordersSchema.table("order_discount_applications", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  orderId: uuid("order_id").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  targetType: text("target_type").notNull(),
  valueType: text("value_type").notNull(),
  code: text("code"),
  title: text("title").notNull(),
  provider: text("provider"),
  valuePercentage: text("value_percentage"),
  valueAmount: money("value_amount"),
  totalAllocatedAmount: money("total_allocated_amount").notNull().default(0n),
  conditions: record("conditions"),
  metadata: record("metadata").notNull().default({}),
  appliedAt: instant("applied_at").notNull().defaultNow(),
});

export const idempotencyRecords = ordersSchema.table(
  "idempotency_records",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    operation: varchar("operation", { length: 128 }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    status: text("status").notNull().default("IN_PROGRESS"),
    resourceType: varchar("resource_type", { length: 128 }),
    resourceId: uuid("resource_id"),
    responseStatus: integer("response_status"),
    response: jsonb("response").$type<{ id: string }>(),
    failureCode: text("failure_code"),
    lockedUntil: instant("locked_until"),
    expiresAt: instant("expires_at"),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("idempotency_records_store_operation_key_unique").on(
      table.storeId,
      table.operation,
      table.idempotencyKey,
    ),
  ],
);
