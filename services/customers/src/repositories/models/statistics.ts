import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  timestamp,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import { customersSchema } from "./schema.js";

export const customerStatistics = customersSchema.table(
  "customer_statistics",
  {
    customerId: uuid("customer_id")
      .primaryKey()
      .references(() => customer.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    ordersCount: integer("orders_count").notNull().default(0),
    completedOrdersCount: integer("completed_orders_count").notNull().default(0),
    cancelledOrdersCount: integer("cancelled_orders_count").notNull().default(0),
    returnsCount: integer("returns_count").notNull().default(0),
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
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "customer_statistics_counts_check",
      sql`${table.ordersCount} >= 0
        AND ${table.completedOrdersCount} >= 0
        AND ${table.cancelledOrdersCount} >= 0
        AND ${table.returnsCount} >= 0
        AND ${table.completedOrdersCount} + ${table.cancelledOrdersCount} <= ${table.ordersCount}`,
    ),
    check(
      "customer_statistics_first_order_pair_check",
      sql`(${table.firstOrderId} IS NULL) = (${table.firstOrderAt} IS NULL)`,
    ),
    check(
      "customer_statistics_last_order_pair_check",
      sql`(${table.lastOrderId} IS NULL) = (${table.lastOrderAt} IS NULL)`,
    ),
    check(
      "customer_statistics_order_time_check",
      sql`${table.firstOrderAt} IS NULL OR ${table.lastOrderAt} IS NULL OR ${table.lastOrderAt} >= ${table.firstOrderAt}`,
    ),
    index("customer_statistics_store_last_order_idx").on(
      table.storeId,
      table.lastOrderAt.desc(),
      table.customerId,
    ),
    index("customer_statistics_store_orders_count_idx").on(
      table.storeId,
      table.completedOrdersCount.desc(),
      table.customerId,
    ),
    index("customer_statistics_store_cancelled_count_idx").on(
      table.storeId,
      table.cancelledOrdersCount,
      table.customerId,
    ),
    index("customer_statistics_store_returns_count_idx").on(
      table.storeId,
      table.returnsCount,
      table.customerId,
    ),
    index("customer_statistics_store_first_order_idx").on(
      table.storeId,
      table.firstOrderAt,
      table.customerId,
    ),
    index("customer_statistics_store_checkout_idx").on(
      table.storeId,
      table.lastCheckoutAt,
      table.customerId,
    ),
  ],
);

export const customerOrderProjection = customersSchema.table(
  "customer_order_projection",
  {
    orderId: uuid("order_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    status: varchar("status", { length: 16 }).$type<"OPEN" | "COMPLETED" | "CANCELLED">().notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    totalAmountMinor: bigint("total_amount_minor", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "string",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("customer_order_projection_revision_check", sql`${table.revision} >= 0`),
    check(
      "customer_order_projection_status_check",
      sql`${table.status} IN ('OPEN', 'COMPLETED', 'CANCELLED')`,
    ),
    check("customer_order_projection_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    check("customer_order_projection_amount_check", sql`${table.totalAmountMinor} >= 0`),
    index("customer_order_projection_customer_idx").on(
      table.storeId,
      table.customerId,
      table.createdAt,
      table.orderId,
    ),
    index("customer_order_projection_customer_status_idx").on(
      table.storeId,
      table.customerId,
      table.status,
      table.createdAt,
      table.completedAt,
      table.cancelledAt,
      table.orderId,
    ),
    index("customer_order_projection_status_created_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
      table.customerId,
    ),
    index("customer_order_projection_status_completed_idx").on(
      table.storeId,
      table.status,
      table.completedAt,
      table.customerId,
    ),
    index("customer_order_projection_status_cancelled_idx").on(
      table.storeId,
      table.status,
      table.cancelledAt,
      table.customerId,
    ),
    index("customer_order_projection_currency_amount_idx").on(
      table.storeId,
      table.currencyCode,
      table.totalAmountMinor,
      table.customerId,
    ),
  ],
);

export const customerCheckoutProjection = customersSchema.table(
  "customer_checkout_projection",
  {
    checkoutId: uuid("checkout_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("customer_checkout_projection_version_check", sql`${table.version} >= 0`),
    index("customer_checkout_projection_customer_idx").on(
      table.storeId,
      table.customerId,
      table.occurredAt,
      table.checkoutId,
    ),
  ],
);

export const customerRefundProjection = customersSchema.table(
  "customer_refund_projection",
  {
    refundId: text("refund_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull(),
    revision: integer("revision").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    refundedAt: timestamp("refunded_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("customer_refund_projection_revision_check", sql`${table.revision} >= 0`),
    check("customer_refund_projection_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    check("customer_refund_projection_amount_check", sql`${table.amountMinor} >= 0`),
    index("customer_refund_projection_customer_idx").on(
      table.storeId,
      table.customerId,
      table.currencyCode,
      table.refundId,
    ),
    index("customer_refund_projection_order_idx").on(table.orderId),
  ],
);

export const customerMonetaryStatistics = customersSchema.table(
  "customer_monetary_statistics",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    ordersCount: integer("orders_count").notNull().default(0),
    totalSpentMinor: bigint("total_spent_minor", { mode: "bigint" }).notNull().default(0n),
    totalRefundedMinor: bigint("total_refunded_minor", { mode: "bigint" }).notNull().default(0n),
    netSpentMinor: bigint("net_spent_minor", { mode: "bigint" }).notNull().default(0n),
    averageOrderValueMinor: bigint("average_order_value_minor", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("customer_monetary_statistics_customer_currency_unique").on(
      table.customerId,
      table.currencyCode,
    ),
    check("customer_monetary_statistics_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    check(
      "customer_monetary_statistics_values_check",
      sql`${table.ordersCount} >= 0
        AND ${table.totalSpentMinor} >= 0
        AND ${table.totalRefundedMinor} >= 0
        AND ${table.totalRefundedMinor} <= ${table.totalSpentMinor}
        AND ${table.netSpentMinor} = ${table.totalSpentMinor} - ${table.totalRefundedMinor}
        AND ${table.averageOrderValueMinor} >= 0`,
    ),
    index("customer_monetary_statistics_store_spend_idx").on(
      table.storeId,
      table.currencyCode,
      table.netSpentMinor.desc(),
      table.customerId,
    ),
    index("customer_monetary_statistics_store_gross_idx").on(
      table.storeId,
      table.currencyCode,
      table.totalSpentMinor,
      table.customerId,
    ),
    index("customer_monetary_statistics_store_refunded_idx").on(
      table.storeId,
      table.currencyCode,
      table.totalRefundedMinor,
      table.customerId,
    ),
    index("customer_monetary_statistics_store_average_idx").on(
      table.storeId,
      table.currencyCode,
      table.averageOrderValueMinor,
      table.customerId,
    ),
  ],
);

export type CustomerStatistics = typeof customerStatistics.$inferSelect;
export type NewCustomerStatistics = typeof customerStatistics.$inferInsert;
export type CustomerOrderProjection = typeof customerOrderProjection.$inferSelect;
export type NewCustomerOrderProjection = typeof customerOrderProjection.$inferInsert;
export type CustomerCheckoutProjection = typeof customerCheckoutProjection.$inferSelect;
export type NewCustomerCheckoutProjection = typeof customerCheckoutProjection.$inferInsert;
export type CustomerRefundProjection = typeof customerRefundProjection.$inferSelect;
export type NewCustomerRefundProjection = typeof customerRefundProjection.$inferInsert;
export type CustomerMonetaryStatistics = typeof customerMonetaryStatistics.$inferSelect;
export type NewCustomerMonetaryStatistics = typeof customerMonetaryStatistics.$inferInsert;
