import {
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventorySchema } from "./schema";
import { variant } from "./products";
import { warehouses } from "./stock";

export const inboundSupply = inventorySchema.table(
  "inbound_supply",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    sourceType: varchar("source_type", { length: 30 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    expectedAt: timestamp("expected_at", { withTimezone: true, mode: "string" }).notNull(),
    qtyExpected: integer("qty_expected").notNull(),
    qtyReceived: integer("qty_received").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("PLANNED"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  },
  (table) => [
    check("inbound_supply_qty_expected_check", sql`${table.qtyExpected} > 0`),
    check(
      "inbound_supply_qty_received_check",
      sql`${table.qtyReceived} >= 0`
    ),
    unique("inbound_supply_project_source_variant_warehouse_key").on(
      table.projectId,
      table.sourceType,
      table.sourceId,
      table.variantId,
      table.warehouseId
    ),
    index("idx_inbound_supply_variant_date").on(
      table.variantId,
      table.warehouseId,
      table.expectedAt
    ),
  ]
);

export type InboundSupply = typeof inboundSupply.$inferSelect;
export type NewInboundSupply = typeof inboundSupply.$inferInsert;
