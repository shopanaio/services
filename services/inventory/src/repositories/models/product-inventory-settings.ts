import {
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";

/**
 * Product inventory settings.
 *
 * NOTE: productId references a product in the Catalog service.
 * The foreign key constraint exists at the database level but is not
 * managed by Drizzle ORM here since Product is owned by Catalog.
 */
export const productInventorySettings = inventorySchema.table(
  "product_inventory_settings",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // References Catalog.product
    alertThresholdMethod: varchar("alert_threshold_method", { length: 20 })
      .notNull()
      .default("SAFETY_STOCK"),
    alertMinimumStock: integer("alert_minimum_stock").notNull().default(10),
    backorderEnabled: boolean("backorder_enabled").notNull().default(false),
    backorderMaxDays: integer("backorder_max_days"),
    backorderMaxQty: integer("backorder_max_qty"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.productId] }),
  ]
);

export type ProductInventorySettings =
  typeof productInventorySettings.$inferSelect;
export type NewProductInventorySettings =
  typeof productInventorySettings.$inferInsert;
