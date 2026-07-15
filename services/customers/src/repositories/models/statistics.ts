import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  timestamp,
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
    completedOrdersCount: integer("completed_orders_count")
      .notNull()
      .default(0),
    cancelledOrdersCount: integer("cancelled_orders_count")
      .notNull()
      .default(0),
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
        AND ${table.completedOrdersCount} + ${table.cancelledOrdersCount} <= ${table.ordersCount}`
    ),
    check(
      "customer_statistics_first_order_pair_check",
      sql`(${table.firstOrderId} IS NULL) = (${table.firstOrderAt} IS NULL)`
    ),
    check(
      "customer_statistics_last_order_pair_check",
      sql`(${table.lastOrderId} IS NULL) = (${table.lastOrderAt} IS NULL)`
    ),
    check(
      "customer_statistics_order_time_check",
      sql`${table.firstOrderAt} IS NULL OR ${table.lastOrderAt} IS NULL OR ${table.lastOrderAt} >= ${table.firstOrderAt}`
    ),
    index("customer_statistics_store_last_order_idx").on(
      table.storeId,
      table.lastOrderAt.desc(),
      table.customerId
    ),
    index("customer_statistics_store_orders_count_idx").on(
      table.storeId,
      table.ordersCount.desc(),
      table.customerId
    ),
  ]
);

export const customerMonetaryStatistics = customersSchema.table(
  "customer_monetary_statistics",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    ordersCount: integer("orders_count").notNull().default(0),
    totalSpentMinor: bigint("total_spent_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    totalRefundedMinor: bigint("total_refunded_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    netSpentMinor: bigint("net_spent_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
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
      table.currencyCode
    ),
    check(
      "customer_monetary_statistics_currency_check",
      sql`${table.currencyCode} ~ '^[A-Z]{3}$'`
    ),
    check(
      "customer_monetary_statistics_values_check",
      sql`${table.ordersCount} >= 0
        AND ${table.totalSpentMinor} >= 0
        AND ${table.totalRefundedMinor} >= 0
        AND ${table.totalRefundedMinor} <= ${table.totalSpentMinor}
        AND ${table.netSpentMinor} = ${table.totalSpentMinor} - ${table.totalRefundedMinor}
        AND ${table.averageOrderValueMinor} >= 0`
    ),
    index("customer_monetary_statistics_store_spend_idx").on(
      table.storeId,
      table.currencyCode,
      table.netSpentMinor.desc(),
      table.customerId
    ),
  ]
);

export type CustomerStatistics = typeof customerStatistics.$inferSelect;
export type NewCustomerStatistics = typeof customerStatistics.$inferInsert;
export type CustomerMonetaryStatistics =
  typeof customerMonetaryStatistics.$inferSelect;
export type NewCustomerMonetaryStatistics =
  typeof customerMonetaryStatistics.$inferInsert;
