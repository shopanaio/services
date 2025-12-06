import {
  uuid,
  integer,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventorySchema } from "./schema";
import { variant } from "./products";

export const dimensionUnitEnum = inventorySchema.enum("dimension_unit", [
  "mm",
  "cm",
  "m",
  "in",
  "ft",
  "yd",
]);

export const weightUnitEnum = inventorySchema.enum("weight_unit", ["g", "kg", "lb", "oz"]);

export const itemDimensions = inventorySchema.table(
  "item_dimensions",
  {
    variantId: uuid("variant_id")
      .primaryKey()
      .references(() => variant.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    wMm: integer("w_mm").notNull(),
    lMm: integer("l_mm").notNull(),
    hMm: integer("h_mm").notNull(),
    displayUnit: dimensionUnitEnum("display_unit").notNull(),
  },
  (table) => [
    // CHECK constraint: all dimensions must be positive
    check(
      "item_dimensions_positive_check",
      sql`${table.wMm} > 0 AND ${table.lMm} > 0 AND ${table.hMm} > 0`
    ),
    index("idx_item_dimensions_project_id").on(table.projectId),
  ]
);

export const itemWeight = inventorySchema.table(
  "item_weight",
  {
    variantId: uuid("variant_id")
      .primaryKey()
      .references(() => variant.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    weightGr: integer("weight_gr").notNull(),
    displayUnit: weightUnitEnum("display_unit").notNull().default("g"),
  },
  (table) => [
    // CHECK constraint: weight must be positive
    check("item_weight_positive_check", sql`${table.weightGr} > 0`),
    index("idx_item_weight_project_id").on(table.projectId),
  ]
);

export type ItemDimensions = typeof itemDimensions.$inferSelect;
export type NewItemDimensions = typeof itemDimensions.$inferInsert;
export type ItemWeight = typeof itemWeight.$inferSelect;
export type NewItemWeight = typeof itemWeight.$inferInsert;
