import { sql } from "drizzle-orm";
import { check, index, integer, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import { customersSchema } from "./schema.js";

/**
 * The authenticated customer's single persisted product comparison set.
 * Guest comparison selections remain storefront-owned client state.
 */
export const customerComparison = customersSchema.table(
  "customer_comparison",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("customer_comparison_customer_id_uniq").on(table.customerId),
    check("customer_comparison_revision_nonnegative_check", sql`${table.revision} >= 0`),
    index("customer_comparison_store_customer_idx").on(table.storeId, table.customerId),
  ],
);

/**
 * One concrete Catalog variant saved as a comparison column. Product ID is
 * retained as a denormalized owner reference. Catalog IDs are cross-service
 * references, so they do not have database foreign keys in Customers.
 */
export const customerComparisonItem = customersSchema.table(
  "customer_comparison_item",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    comparisonId: uuid("comparison_id")
      .notNull()
      .references(() => customerComparison.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("customer_comparison_item_comparison_variant_uniq").on(
      table.comparisonId,
      table.variantId,
    ),
    unique("customer_comparison_item_comparison_position_uniq").on(
      table.comparisonId,
      table.position,
    ),
    check("customer_comparison_item_position_nonnegative_check", sql`${table.position} >= 0`),
    index("customer_comparison_item_store_product_idx").on(table.storeId, table.productId),
    index("customer_comparison_item_store_variant_idx").on(table.storeId, table.variantId),
    index("customer_comparison_item_comparison_position_idx").on(
      table.comparisonId,
      table.position,
    ),
  ],
);

export type CustomerComparison = typeof customerComparison.$inferSelect;
export type NewCustomerComparison = typeof customerComparison.$inferInsert;
export type CustomerComparisonItem = typeof customerComparisonItem.$inferSelect;
export type NewCustomerComparisonItem = typeof customerComparisonItem.$inferInsert;
