import { uuid, text, primaryKey, index } from "drizzle-orm/pg-core";
import { catalogSchema, localeCodeEnum } from "./schema";
import { warehouses } from "./stock";

// ─────────────────────────────────────────────────────────────────────────────
// Warehouse Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates warehouse display names

export const warehouseTranslation = catalogSchema.table(
  "warehouse_translation",
  {
    storeId: uuid("store_id").notNull(),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.warehouseId, table.locale] }),
    index("idx_warehouse_translation_store").on(table.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type WarehouseTranslation = typeof warehouseTranslation.$inferSelect;
export type NewWarehouseTranslation = typeof warehouseTranslation.$inferInsert;
