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

export const reservationStatusEnum = inventorySchema.enum(
  "reservation_status",
  ["ACTIVE", "RELEASED", "FULFILLED"]
);

export const reservations = inventorySchema.table(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    orderSystem: varchar("order_system", { length: 50 }).notNull(),
    orderId: varchar("order_id", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    status: reservationStatusEnum("status").notNull().default("ACTIVE"),
    reservedAt: timestamp("reserved_at", { withTimezone: true }).defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => [
    check("reservations_quantity_check", sql`${table.quantity} > 0`),
    unique("reservations_project_order_variant_warehouse_key").on(
      table.projectId,
      table.orderSystem,
      table.orderId,
      table.variantId,
      table.warehouseId
    ),
    index("idx_reservations_variant").on(table.variantId),
    index("idx_reservations_order").on(table.orderSystem, table.orderId),
  ]
);

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
