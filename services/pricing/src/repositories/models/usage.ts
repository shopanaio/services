import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { discount, discountCode } from "./discounts.js";
import {
  currencyCodeEnum,
  discountAllocationTargetTypeEnum,
  discountClassEnum,
  discountRedemptionStatusEnum,
  discountReservationStatusEnum,
  pricingSchema,
} from "./schema.js";

export const discountUsageCounter = pricingSchema.table(
  "discount_usage_counter",
  {
    discountId: uuid("discount_id")
      .primaryKey()
      .references(() => discount.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    reservedCount: bigint("reserved_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    committedCount: bigint("committed_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    reversedCount: bigint("reversed_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    version: bigint("version", { mode: "bigint" }).notNull().default(0n),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "discount_usage_counter_counts_check",
      sql`${table.reservedCount} >= 0
        AND ${table.committedCount} >= 0
        AND ${table.reversedCount} >= 0
        AND ${table.reversedCount} <= ${table.committedCount}`,
    ),
    check(
      "discount_usage_counter_version_check",
      sql`${table.version} >= 0`,
    ),
    index("discount_usage_counter_store_idx").on(
      table.storeId,
      table.discountId,
    ),
  ],
);

export const discountCodeUsageCounter = pricingSchema.table(
  "discount_code_usage_counter",
  {
    codeId: uuid("code_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id").notNull(),
    reservedCount: bigint("reserved_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    committedCount: bigint("committed_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    reversedCount: bigint("reversed_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    version: bigint("version", { mode: "bigint" }).notNull().default(0n),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "discount_code_usage_counter_code_fk",
      columns: [table.discountId, table.codeId],
      foreignColumns: [discountCode.discountId, discountCode.id],
    }).onDelete("cascade"),
    check(
      "discount_code_usage_counter_counts_check",
      sql`${table.reservedCount} >= 0
        AND ${table.committedCount} >= 0
        AND ${table.reversedCount} >= 0
        AND ${table.reversedCount} <= ${table.committedCount}`,
    ),
    check(
      "discount_code_usage_counter_version_check",
      sql`${table.version} >= 0`,
    ),
    index("discount_code_usage_counter_store_discount_idx").on(
      table.storeId,
      table.discountId,
      table.codeId,
    ),
  ],
);

export const discountUsageReservation = pricingSchema.table(
  "discount_usage_reservation",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "restrict" }),
    codeId: uuid("code_id"),
    customerId: uuid("customer_id"),
    checkoutId: uuid("checkout_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: discountReservationStatusEnum("status")
      .notNull()
      .default("ACTIVE"),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "string",
    }),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "string" }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "discount_usage_reservation_code_fk",
      columns: [table.discountId, table.codeId],
      foreignColumns: [discountCode.discountId, discountCode.id],
    }).onDelete("restrict"),
    unique("discount_usage_reservation_store_id_unique").on(
      table.storeId,
      table.id,
    ),
    unique("discount_usage_reservation_store_discount_id_unique").on(
      table.storeId,
      table.discountId,
      table.id,
    ),
    unique("discount_usage_reservation_discount_id_id_unique").on(
      table.discountId,
      table.id,
    ),
    unique("discount_usage_reservation_idempotency_unique").on(
      table.storeId,
      table.idempotencyKey,
    ),
    check(
      "discount_usage_reservation_idempotency_check",
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "discount_usage_reservation_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "discount_usage_reservation_status_check",
      sql`(${table.status} = 'ACTIVE'
          AND ${table.committedAt} IS NULL
          AND ${table.closedAt} IS NULL)
        OR (${table.status} = 'COMMITTED'
          AND ${table.committedAt} IS NOT NULL
          AND ${table.closedAt} IS NULL)
        OR (${table.status} IN ('RELEASED', 'EXPIRED')
          AND ${table.committedAt} IS NULL
          AND ${table.closedAt} IS NOT NULL)`,
    ),
    check(
      "discount_usage_reservation_metadata_object_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
    uniqueIndex("discount_usage_reservation_active_checkout_unique")
      .on(table.storeId, table.discountId, table.checkoutId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("discount_usage_reservation_expiry_queue_idx")
      .on(table.expiresAt, table.id)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("discount_usage_reservation_store_checkout_idx").on(
      table.storeId,
      table.checkoutId,
      table.createdAt.desc(),
      table.id,
    ),
    index("discount_usage_reservation_store_customer_idx")
      .on(table.storeId, table.customerId, table.createdAt.desc(), table.id)
      .where(sql`${table.customerId} IS NOT NULL`),
  ],
);

export const discountRedemption = pricingSchema.table(
  "discount_redemption",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "restrict" }),
    codeId: uuid("code_id"),
    reservationId: uuid("reservation_id"),
    customerId: uuid("customer_id"),
    checkoutId: uuid("checkout_id").notNull(),
    orderId: uuid("order_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: discountRedemptionStatusEnum("status")
      .notNull()
      .default("COMMITTED"),
    discountClass: discountClassEnum("discount_class").notNull(),
    configurationRevision: integer("configuration_revision").notNull(),
    title: varchar("title", { length: 255 }),
    code: varchar("code", { length: 255 }),
    currency: currencyCodeEnum("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    reversedAt: timestamp("reversed_at", {
      withTimezone: true,
      mode: "string",
    }),
    reversalReason: text("reversal_reason"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "discount_redemption_code_fk",
      columns: [table.discountId, table.codeId],
      foreignColumns: [discountCode.discountId, discountCode.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "discount_redemption_reservation_fk",
      columns: [table.discountId, table.reservationId],
      foreignColumns: [
        discountUsageReservation.discountId,
        discountUsageReservation.id,
      ],
    }).onDelete("restrict"),
    unique("discount_redemption_store_id_unique").on(table.storeId, table.id),
    unique("discount_redemption_store_discount_id_unique").on(
      table.storeId,
      table.discountId,
      table.id,
    ),
    unique("discount_redemption_discount_id_id_unique").on(
      table.discountId,
      table.id,
    ),
    unique("discount_redemption_idempotency_unique").on(
      table.storeId,
      table.idempotencyKey,
    ),
    unique("discount_redemption_order_unique").on(
      table.storeId,
      table.discountId,
      table.orderId,
    ),
    unique("discount_redemption_reservation_unique").on(table.reservationId),
    check(
      "discount_redemption_idempotency_check",
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "discount_redemption_revision_check",
      sql`${table.configurationRevision} >= 0`,
    ),
    check(
      "discount_redemption_title_check",
      sql`${table.title} IS NULL OR length(btrim(${table.title})) > 0`,
    ),
    check(
      "discount_redemption_code_check",
      sql`${table.code} IS NULL OR length(btrim(${table.code})) > 0`,
    ),
    check(
      "discount_redemption_amount_check",
      sql`${table.amountMinor} >= 0`,
    ),
    check(
      "discount_redemption_status_check",
      sql`(${table.status} = 'COMMITTED'
          AND ${table.reversedAt} IS NULL
          AND ${table.reversalReason} IS NULL)
        OR (${table.status} = 'REVERSED'
          AND ${table.reversedAt} IS NOT NULL
          AND ${table.reversalReason} IS NOT NULL
          AND length(btrim(${table.reversalReason})) > 0)`,
    ),
    check(
      "discount_redemption_reverse_time_check",
      sql`${table.reversedAt} IS NULL OR ${table.reversedAt} >= ${table.committedAt}`,
    ),
    check(
      "discount_redemption_metadata_object_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
    index("discount_redemption_store_committed_idx").on(
      table.storeId,
      table.committedAt.desc(),
      table.id,
    ),
    index("discount_redemption_discount_usage_idx").on(
      table.storeId,
      table.discountId,
      table.status,
      table.committedAt.desc(),
      table.id,
    ),
    index("discount_redemption_customer_usage_idx")
      .on(
        table.storeId,
        table.discountId,
        table.customerId,
        table.committedAt.desc(),
        table.id,
      )
      .where(sql`${table.customerId} IS NOT NULL`),
    index("discount_redemption_code_usage_idx")
      .on(
        table.storeId,
        table.codeId,
        table.status,
        table.committedAt.desc(),
        table.id,
      )
      .where(sql`${table.codeId} IS NOT NULL`),
  ],
);

export const discountRedemptionAllocation = pricingSchema.table(
  "discount_redemption_allocation",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id").notNull(),
    redemptionId: uuid("redemption_id").notNull(),
    targetType: discountAllocationTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id"),
    quantity: integer("quantity"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "discount_redemption_allocation_redemption_fk",
      columns: [table.discountId, table.redemptionId],
      foreignColumns: [discountRedemption.discountId, discountRedemption.id],
    }).onDelete("cascade"),
    check(
      "discount_redemption_allocation_target_check",
      sql`(${table.targetType} = 'ORDER' AND ${table.targetId} IS NULL)
        OR (${table.targetType} <> 'ORDER' AND ${table.targetId} IS NOT NULL)`,
    ),
    check(
      "discount_redemption_allocation_quantity_check",
      sql`${table.quantity} IS NULL OR ${table.quantity} > 0`,
    ),
    check(
      "discount_redemption_allocation_amount_check",
      sql`${table.amountMinor} >= 0`,
    ),
    check(
      "discount_redemption_allocation_metadata_object_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
    index("discount_redemption_allocation_redemption_idx").on(
      table.redemptionId,
      table.targetType,
      table.targetId,
      table.id,
    ),
    index("discount_redemption_allocation_target_idx")
      .on(
        table.storeId,
        table.targetType,
        table.targetId,
        table.createdAt.desc(),
        table.id,
      )
      .where(sql`${table.targetId} IS NOT NULL`),
  ],
);

export type DiscountUsageCounter = typeof discountUsageCounter.$inferSelect;
export type NewDiscountUsageCounter = typeof discountUsageCounter.$inferInsert;
export type DiscountCodeUsageCounter =
  typeof discountCodeUsageCounter.$inferSelect;
export type NewDiscountCodeUsageCounter =
  typeof discountCodeUsageCounter.$inferInsert;
export type DiscountUsageReservation =
  typeof discountUsageReservation.$inferSelect;
export type NewDiscountUsageReservation =
  typeof discountUsageReservation.$inferInsert;
export type DiscountRedemption = typeof discountRedemption.$inferSelect;
export type NewDiscountRedemption = typeof discountRedemption.$inferInsert;
export type DiscountRedemptionAllocation =
  typeof discountRedemptionAllocation.$inferSelect;
export type NewDiscountRedemptionAllocation =
  typeof discountRedemptionAllocation.$inferInsert;
