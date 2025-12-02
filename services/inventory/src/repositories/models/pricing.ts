import {
  pgTable,
  pgEnum,
  pgView,
  uuid,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { variant } from "./products";

export const currencyEnum = pgEnum("currency", ["UAH", "USD", "EUR"]);

export const itemPricing = pgTable(
  "item_pricing",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    currency: currencyEnum("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    compareAtMinor: bigint("compare_at_minor", { mode: "number" }),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // CHECK constraints
    check("item_pricing_amount_minor_check", sql`${table.amountMinor} >= 0`),
    check("item_pricing_compare_at_minor_check", sql`${table.compareAtMinor} >= 0`),
    check(
      "item_pricing_effective_interval_check",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`
    ),
    // Indexes
    index("idx_item_pricing_variant_currency_effective_from").on(
      table.projectId,
      table.variantId,
      table.currency,
      table.effectiveFrom
    ),
    index("idx_item_pricing_variant_effective_from").on(
      table.projectId,
      table.variantId,
      table.effectiveFrom
    ),
    index("idx_item_pricing_recorded_at").on(table.projectId, table.recordedAt),
    index("idx_item_pricing_effective_to").on(table.projectId, table.effectiveTo),
    uniqueIndex("idx_item_pricing_current_unique")
      .on(table.projectId, table.variantId, table.currency)
      .where(sql`effective_to IS NULL`),
  ]
);

// View: current prices (effective_to IS NULL)
export const variantPricesCurrent = pgView("variant_prices_current").as((qb) =>
  qb
    .select({
      id: itemPricing.id,
      projectId: itemPricing.projectId,
      variantId: itemPricing.variantId,
      currency: itemPricing.currency,
      amountMinor: itemPricing.amountMinor,
      compareAtMinor: itemPricing.compareAtMinor,
      effectiveFrom: itemPricing.effectiveFrom,
      effectiveTo: itemPricing.effectiveTo,
      recordedAt: itemPricing.recordedAt,
    })
    .from(itemPricing)
    .where(sql`${itemPricing.effectiveTo} IS NULL`)
);

export type ItemPricing = typeof itemPricing.$inferSelect;
export type NewItemPricing = typeof itemPricing.$inferInsert;
