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

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type WarehouseTranslation = typeof warehouseTranslation.$inferSelect;
export type NewWarehouseTranslation = typeof warehouseTranslation.$inferInsert;
