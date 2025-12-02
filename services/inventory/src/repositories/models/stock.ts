import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
  uniqueIndex,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { variant } from "./products";

export const warehouses = pgTable(
  "warehouses",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("warehouses_project_id_code_key").on(table.projectId, table.code),
    uniqueIndex("idx_warehouses_default_unique")
      .on(table.projectId)
      .where(sql`is_default = true`),
    uniqueIndex("idx_warehouses_project_id_id_unique").on(
      table.projectId,
      table.id
    ),
  ]
);

export const warehouseStock = pgTable(
  "warehouse_stock",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    warehouseId: uuid("warehouse_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // CHECK constraint
    check("warehouse_stock_quantity_check", sql`${table.quantityOnHand} >= 0`),
    // Unique constraint
    unique("warehouse_stock_project_id_warehouse_id_variant_id_key").on(
      table.projectId,
      table.warehouseId,
      table.variantId
    ),
    // Index
    index("idx_warehouse_stock_variant").on(table.projectId, table.variantId),
    // Composite foreign key to warehouse with cross-project reference protection
    foreignKey({
      name: "warehouse_stock_warehouse_fk",
      columns: [table.projectId, table.warehouseId],
      foreignColumns: [warehouses.projectId, warehouses.id],
    }).onDelete("cascade"),
  ]
);

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type WarehouseStock = typeof warehouseStock.$inferSelect;
export type NewWarehouseStock = typeof warehouseStock.$inferInsert;
