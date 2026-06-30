import {
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

/**
 * InventoryItem - единица учета запасов, 1:1 связь с Variant.
 *
 * Содержит все данные связанные с инвентарем:
 * - SKU (переносится из Variant)
 * - Track inventory settings
 * - Continue selling when out of stock
 *
 * Физические характеристики (dimensions, weight) и cost остаются
 * в отдельных таблицах, связанных через variantId (в будущем - inventoryItemId).
 */
export const inventoryItem = catalogSchema.table(
  "inventory_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),

    // Reference to Catalog.Variant
    variantId: uuid("variant_id").notNull().unique(),

    // SKU
    sku: varchar("sku", { length: 255 }),

    // Tracking settings
    trackInventory: boolean("track_inventory").notNull().default(true),
    continueSellingWhenOutOfStock: boolean("continue_selling_when_out_of_stock")
      .notNull()
      .default(false),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Index for variant lookup (federation)
    index("idx_inventory_item_variant").on(table.variantId),
    // Index for project
    index("idx_inventory_item_project").on(table.projectId),
    // SKU uniqueness per project
    unique("inventory_item_sku_unique").on(table.projectId, table.sku),
  ]
);

export type InventoryItem = typeof inventoryItem.$inferSelect;
export type NewInventoryItem = typeof inventoryItem.$inferInsert;
