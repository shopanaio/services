import {
  uuid,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventorySchema } from "./schema";
import { variant } from "./products";
import { currencyEnum } from "./pricing";

export const productVariantCostHistory = inventorySchema.table(
  "product_variant_cost_history",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    currency: currencyEnum("currency").notNull(),
    unitCostMinor: bigint("unit_cost_minor", { mode: "number" }).notNull(),
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
    check("product_variant_cost_history_unit_cost_minor_check", sql`${table.unitCostMinor} >= 0`),
    check(
      "product_variant_cost_history_effective_interval_check",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`
    ),
    // Indexes
    index("idx_product_variant_cost_history_variant_currency_effective_from").on(
      table.projectId,
      table.variantId,
      table.currency,
      table.effectiveFrom
    ),
    index("idx_product_variant_cost_history_variant_effective_from").on(
      table.projectId,
      table.variantId,
      table.effectiveFrom
    ),
    index("idx_product_variant_cost_history_recorded_at").on(
      table.projectId,
      table.recordedAt
    ),
    index("idx_product_variant_cost_history_effective_to").on(
      table.projectId,
      table.effectiveTo
    ),
    uniqueIndex("idx_product_variant_cost_history_current_unique")
      .on(table.projectId, table.variantId, table.currency)
      .where(sql`effective_to IS NULL`),
  ]
);

// View: current costs (effective_to IS NULL)
export const variantCostsCurrent = inventorySchema.view("variant_costs_current").as((qb) =>
  qb
    .select({
      id: productVariantCostHistory.id,
      projectId: productVariantCostHistory.projectId,
      variantId: productVariantCostHistory.variantId,
      currency: productVariantCostHistory.currency,
      unitCostMinor: productVariantCostHistory.unitCostMinor,
      effectiveFrom: productVariantCostHistory.effectiveFrom,
      effectiveTo: productVariantCostHistory.effectiveTo,
      recordedAt: productVariantCostHistory.recordedAt,
    })
    .from(productVariantCostHistory)
    .where(sql`${productVariantCostHistory.effectiveTo} IS NULL`)
);

export type ProductVariantCostHistory = typeof productVariantCostHistory.$inferSelect;
export type NewProductVariantCostHistory = typeof productVariantCostHistory.$inferInsert;
