import {
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventorySchema } from "./schema";
import { warehouses } from "./stock";

export const stockMovementTypeEnum = inventorySchema.enum("stock_movement_type", [
  "SEED",
  "RECEIVE",
  "SELL",
  "RETURN",
  "ADJUST",
  "RESERVE",
  "RELEASE",
  "TRANSFER",
]);

export const stockMovementReasonEnum = inventorySchema.enum("stock_movement_reason", [
  "DAMAGE",
  "INVENTORY_COUNT",
  "MANUAL",
  "CUSTOMER_RETURN",
]);

export const stockTransferDirectionEnum = inventorySchema.enum(
  "stock_transfer_direction",
  ["IN", "OUT"]
);

export const stockApplyStatusEnum = inventorySchema.enum("stock_apply_status", [
  "APPLIED",
  "REJECTED",
]);

export const stockChanges = inventorySchema.table(
  "stock_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: bigint("seq", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    deltaOnHand: integer("delta_on_hand").notNull().default(0),
    deltaReserved: integer("delta_reserved").notNull().default(0),
    deltaUnavailable: integer("delta_unavailable").notNull().default(0),
    onHandAfter: integer("on_hand_after").notNull(),
    reservedAfter: integer("reserved_after").notNull(),
    unavailableAfter: integer("unavailable_after").notNull(),
    movementType: stockMovementTypeEnum("movement_type").notNull(),
    transferDirection: stockTransferDirectionEnum("transfer_direction"),
    reason: stockMovementReasonEnum("reason"),
    sourceSystem: varchar("source_system", { length: 30 }).notNull(),
    sourceEventId: varchar("source_event_id", { length: 128 }).notNull(),
    correlationId: uuid("correlation_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
    applyStatus: stockApplyStatusEnum("apply_status")
      .notNull()
      .default("APPLIED"),
  },
  (table) => [
    check(
      "stock_changes_delta_check",
      sql`${table.movementType} = 'SEED' OR ${table.deltaOnHand} <> 0 OR ${table.deltaReserved} <> 0 OR ${table.deltaUnavailable} <> 0`
    ),
    check(
      "stock_changes_on_hand_after_check",
      sql`${table.onHandAfter} >= 0`
    ),
    check(
      "stock_changes_reserved_after_check",
      sql`${table.reservedAfter} >= 0`
    ),
    check(
      "stock_changes_unavailable_after_check",
      sql`${table.unavailableAfter} >= 0`
    ),
    check(
      "stock_changes_unavailable_le_onhand_check",
      sql`${table.unavailableAfter} <= ${table.onHandAfter}`
    ),
    check(
      "stock_changes_transfer_dir_check",
      sql`CASE WHEN ${table.movementType} = 'TRANSFER' THEN ${table.transferDirection} IS NOT NULL ELSE ${table.transferDirection} IS NULL END`
    ),
    check(
      "stock_changes_transfer_correlation_check",
      sql`${table.movementType} <> 'TRANSFER' OR ${table.correlationId} IS NOT NULL`
    ),
    uniqueIndex("stock_changes_seq_unique").on(table.seq),
    uniqueIndex("idx_stock_changes_idempotency").on(
      table.projectId,
      table.sourceSystem,
      table.sourceEventId,
      table.warehouseId,
      table.variantId
    ),
    index("idx_stock_changes_idempo_lookup").on(
      table.projectId,
      table.sourceSystem,
      table.sourceEventId
    ),
    index("idx_stock_changes_variant_created_seq").on(
      table.variantId,
      table.createdAt,
      table.seq
    ),
    index("idx_stock_changes_variant_warehouse_created_seq").on(
      table.variantId,
      table.warehouseId,
      table.createdAt,
      table.seq
    ),
    index("idx_stock_changes_project_seq").on(table.projectId, table.seq),
    index("idx_stock_changes_type_seq").on(table.movementType, table.seq),
    index("idx_stock_changes_reason_seq").on(table.reason, table.seq),
  ]
);

export type StockChange = typeof stockChanges.$inferSelect;
export type NewStockChange = typeof stockChanges.$inferInsert;
