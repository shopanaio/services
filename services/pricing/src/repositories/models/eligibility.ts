import { sql } from "drizzle-orm";
import {
  check,
  index,
  primaryKey,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import {
  discountBuyerContextTypeEnum,
  pricingSchema,
  referenceStatusEnum,
} from "./schema.js";

export const discountBuyerContext = pricingSchema.table(
  "discount_buyer_context",
  {
    discountId: uuid("discount_id")
      .primaryKey()
      .references(() => discount.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    contextType: discountBuyerContextTypeEnum("context_type")
      .notNull()
      .default("ALL"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("discount_buyer_context_store_discount_unique").on(
      table.storeId,
      table.discountId,
    ),
    index("discount_buyer_context_store_type_idx").on(
      table.storeId,
      table.contextType,
      table.discountId,
    ),
  ],
);

export const discountEligibleCustomer = pricingSchema.table(
  "discount_eligible_customer",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discountBuyerContext.discountId, {
        onDelete: "cascade",
      }),
    customerId: uuid("customer_id").notNull(),
    referenceStatus: referenceStatusEnum("reference_status")
      .notNull()
      .default("VALID"),
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
      name: "discount_eligible_customer_pkey",
      columns: [table.discountId, table.customerId],
    }),
    check(
      "discount_eligible_customer_reference_status_check",
      sql`${table.referenceStatus} = 'VALID' OR ${table.referenceStatusChangedAt} IS NOT NULL`,
    ),
    index("discount_eligible_customer_store_lookup_idx").on(
      table.storeId,
      table.customerId,
      table.discountId,
    ),
    index("discount_eligible_customer_stale_idx")
      .on(table.storeId, table.referenceStatusChangedAt, table.discountId)
      .where(sql`${table.referenceStatus} = 'STALE'`),
  ],
);

export const discountEligibleSegment = pricingSchema.table(
  "discount_eligible_segment",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discountBuyerContext.discountId, {
        onDelete: "cascade",
      }),
    segmentId: uuid("segment_id").notNull(),
    referenceStatus: referenceStatusEnum("reference_status")
      .notNull()
      .default("VALID"),
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
      name: "discount_eligible_segment_pkey",
      columns: [table.discountId, table.segmentId],
    }),
    check(
      "discount_eligible_segment_reference_status_check",
      sql`${table.referenceStatus} = 'VALID' OR ${table.referenceStatusChangedAt} IS NOT NULL`,
    ),
    index("discount_eligible_segment_store_lookup_idx").on(
      table.storeId,
      table.segmentId,
      table.discountId,
    ),
    index("discount_eligible_segment_stale_idx")
      .on(table.storeId, table.referenceStatusChangedAt, table.discountId)
      .where(sql`${table.referenceStatus} = 'STALE'`),
  ],
);

export type DiscountBuyerContext = typeof discountBuyerContext.$inferSelect;
export type NewDiscountBuyerContext = typeof discountBuyerContext.$inferInsert;
export type DiscountEligibleCustomer =
  typeof discountEligibleCustomer.$inferSelect;
export type NewDiscountEligibleCustomer =
  typeof discountEligibleCustomer.$inferInsert;
export type DiscountEligibleSegment =
  typeof discountEligibleSegment.$inferSelect;
export type NewDiscountEligibleSegment =
  typeof discountEligibleSegment.$inferInsert;
