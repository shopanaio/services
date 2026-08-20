import {
  bigint,
  boolean,
  char,
  date,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  consentStateEnum,
  customerAccountStatusEnum,
  customerLifecycleStatusEnum,
  customerSegmentStatusEnum,
  customerSegmentTypeEnum,
  customersSchema,
} from "./schema.js";

export const customerListView = customersSchema
  .view("customer_list_view", {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").notNull(),
    iamPrincipalId: text("iam_principal_id"),
    lifecycleStatus: customerLifecycleStatusEnum("lifecycle_status").notNull(),
    accountStatus: customerAccountStatusEnum("account_status").notNull(),
    email: varchar("email", { length: 320 }),
    normalizedEmail: varchar("normalized_email", { length: 320 }),
    emailVerified: boolean("email_verified").notNull(),
    phoneE164: varchar("phone_e164", { length: 32 }),
    phoneVerified: boolean("phone_verified").notNull(),
    prefix: varchar("prefix", { length: 32 }),
    firstName: varchar("first_name", { length: 128 }),
    middleName: varchar("middle_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),
    suffix: varchar("suffix", { length: 32 }),
    preferredLocale: varchar("preferred_locale", { length: 35 }),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: varchar("gender", { length: 32 }),
    companyName: varchar("company_name", { length: 255 }),
    jobTitle: varchar("job_title", { length: 255 }),
    note: text("note"),
    blockedReason: text("blocked_reason"),
    moderationNote: text("moderation_note"),
    source: varchar("source", { length: 64 }).notNull(),
    createdByUserId: text("created_by_user_id"),
    revision: integer("revision").notNull(),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "string",
    }),
    mergedIntoCustomerId: uuid("merged_into_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    redactedAt: timestamp("redacted_at", {
      withTimezone: true,
      mode: "string",
    }),
    displayName: text("display_name").notNull(),
    defaultShippingAddressId: uuid("default_shipping_address_id"),
    defaultShippingCity: varchar("default_shipping_city", { length: 128 }),
    defaultShippingRegionCode: varchar("default_shipping_region_code", {
      length: 64,
    }),
    defaultShippingCountryCode: char("default_shipping_country_code", {
      length: 2,
    }),
    emailMarketingState: consentStateEnum("email_marketing_state"),
    ordersCount: integer("orders_count"),
    totalOrdersCount: integer("total_orders_count"),
    completedOrdersCount: integer("completed_orders_count"),
    cancelledOrdersCount: integer("cancelled_orders_count"),
    returnsCount: integer("returns_count"),
    firstOrderId: uuid("first_order_id"),
    firstOrderAt: timestamp("first_order_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastOrderId: uuid("last_order_id"),
    lastOrderAt: timestamp("last_order_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastCheckoutAt: timestamp("last_checkout_at", {
      withTimezone: true,
      mode: "string",
    }),
    statisticsUpdatedAt: timestamp("statistics_updated_at", {
      withTimezone: true,
      mode: "string",
    }),
    currencyCode: varchar("currency_code", { length: 3 }),
    monetaryOrdersCount: integer("monetary_orders_count"),
    totalSpentMinor: bigint("total_spent_minor", { mode: "bigint" }),
    totalRefundedMinor: bigint("total_refunded_minor", {
      mode: "bigint",
    }),
    netSpentMinor: bigint("net_spent_minor", { mode: "bigint" }),
    averageOrderValueMinor: bigint("average_order_value_minor", {
      mode: "bigint",
    }),
    monetaryStatisticsUpdatedAt: timestamp("monetary_statistics_updated_at", {
      withTimezone: true,
      mode: "string",
    }),
  })
  .existing();

export const customerSegmentListView = customersSchema
  .view("customer_segment_list_view", {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }),
    type: customerSegmentTypeEnum("type").notNull(),
    status: customerSegmentStatusEnum("status").notNull(),
    query: text("query"),
    definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
    createdById: text("created_by_id"),
    revision: integer("revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    customersCount: integer("customers_count").notNull(),
  })
  .existing();

export type CustomerListView = typeof customerListView.$inferSelect;
export type CustomerSegmentListView = typeof customerSegmentListView.$inferSelect;
