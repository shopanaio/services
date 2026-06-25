import {
  uuid,
  varchar,
  text,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";
import { warehouses } from "./stock";

// ─────────────────────────────────────────────────────────────────────────────
// Warehouse Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates warehouse display names

export const warehouseTranslation = catalogSchema.table(
  "warehouse_translation",
  {
    projectId: uuid("project_id").notNull(),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.warehouseId, table.locale] }),
    index("idx_warehouse_translation_project").on(table.projectId),
  ]
);

export const inventoryProductTranslation = catalogSchema.table(
  "inventory_product_translation",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    index("idx_inventory_product_translation_project").on(table.projectId),
    index("idx_inventory_product_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
    index("idx_inventory_product_translation_project_locale_name").on(
      table.projectId,
      table.locale,
      table.name
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type WarehouseTranslation = typeof warehouseTranslation.$inferSelect;
export type NewWarehouseTranslation = typeof warehouseTranslation.$inferInsert;
export type InventoryProductTranslation =
  typeof inventoryProductTranslation.$inferSelect;
export type NewInventoryProductTranslation =
  typeof inventoryProductTranslation.$inferInsert;
