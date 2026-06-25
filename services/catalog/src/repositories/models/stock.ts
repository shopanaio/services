import {
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
import { catalogSchema } from "./schema";

export const warehouses = catalogSchema.table(
  "warehouses",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("warehouses_project_id_code_key").on(table.projectId, table.code),
    unique("warehouses_project_id_id_unique").on(table.projectId, table.id),
    uniqueIndex("idx_warehouses_default_unique")
      .on(table.projectId)
      .where(sql`is_default = true`),
  ]
);

export const warehouseStock = catalogSchema.table(
  "warehouse_stock",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    warehouseId: uuid("warehouse_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    reservedQty: integer("reserved_qty").notNull().default(0),
    unavailableQty: integer("unavailable_qty").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // CHECK constraint
    check("warehouse_stock_quantity_check", sql`${table.quantityOnHand} >= 0`),
    check("warehouse_stock_reserved_check", sql`${table.reservedQty} >= 0`),
    check(
      "warehouse_stock_unavailable_check",
      sql`${table.unavailableQty} >= 0`
    ),
    check(
      "warehouse_stock_unavailable_le_onhand_check",
      sql`${table.unavailableQty} <= ${table.quantityOnHand}`
    ),
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
