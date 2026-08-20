import { sql } from "drizzle-orm";
import { check, foreignKey, index, primaryKey, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import {
  discountTargetRoleEnum,
  discountTargetTypeEnum,
  pricingSchema,
  referenceStatusEnum,
} from "./schema.js";

export const discountTargetSelection = pricingSchema.table(
  "discount_target_selection",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "cascade" }),
    role: discountTargetRoleEnum("role").notNull(),
    targetType: discountTargetTypeEnum("target_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "discount_target_selection_pkey",
      columns: [table.discountId, table.role],
    }),
    unique("discount_target_selection_type_unique").on(
      table.discountId,
      table.role,
      table.targetType,
    ),
    index("discount_target_selection_store_idx").on(
      table.storeId,
      table.targetType,
      table.discountId,
      table.role,
    ),
  ],
);

export const discountTarget = pricingSchema.table(
  "discount_target",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id").notNull(),
    role: discountTargetRoleEnum("role").notNull(),
    targetType: discountTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    referenceStatus: referenceStatusEnum("reference_status").notNull().default("VALID"),
    referenceStatusChangedAt: timestamp("reference_status_changed_at", {
      withTimezone: true,
      mode: "string",
    }),
    referenceCheckedAt: timestamp("reference_checked_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "discount_target_pkey",
      columns: [table.discountId, table.role, table.targetId],
    }),
    foreignKey({
      name: "discount_target_selection_fk",
      columns: [table.discountId, table.role, table.targetType],
      foreignColumns: [
        discountTargetSelection.discountId,
        discountTargetSelection.role,
        discountTargetSelection.targetType,
      ],
    }).onDelete("cascade"),
    check("discount_target_specific_type_check", sql`${table.targetType} <> 'ALL_PRODUCTS'`),
    check(
      "discount_target_reference_status_check",
      sql`${table.referenceStatus} = 'VALID' OR ${table.referenceStatusChangedAt} IS NOT NULL`,
    ),
    index("discount_target_store_reverse_lookup_idx").on(
      table.storeId,
      table.targetType,
      table.targetId,
      table.discountId,
      table.role,
    ),
    index("discount_target_stale_idx")
      .on(table.storeId, table.referenceStatusChangedAt, table.discountId, table.role)
      .where(sql`${table.referenceStatus} = 'STALE'`),
  ],
);

export type DiscountTargetSelection = typeof discountTargetSelection.$inferSelect;
export type NewDiscountTargetSelection = typeof discountTargetSelection.$inferInsert;
export type DiscountTarget = typeof discountTarget.$inferSelect;
export type NewDiscountTarget = typeof discountTarget.$inferInsert;
