import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  smallint,
  uuid,
} from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import {
  discountAllocationMethodEnum,
  discountRequirementTypeEnum,
  discountValueTypeEnum,
  pricingSchema,
} from "./schema.js";

export const discountAmountOff = pricingSchema.table(
  "discount_amount_off",
  {
    discountId: uuid("discount_id")
      .primaryKey()
      .references(() => discount.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    valueType: discountValueTypeEnum("value_type").notNull(),
    percentageBps: smallint("percentage_bps"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }),
    allocationMethod: discountAllocationMethodEnum("allocation_method")
      .notNull()
      .default("ACROSS"),
    maximumDiscountMinor: bigint("maximum_discount_minor", {
      mode: "bigint",
    }),
  },
  (table) => [
    check(
      "discount_amount_off_value_type_check",
      sql`${table.valueType} IN ('PERCENTAGE', 'FIXED_AMOUNT')`,
    ),
    check(
      "discount_amount_off_value_check",
      sql`(${table.valueType} = 'PERCENTAGE'
          AND ${table.percentageBps} BETWEEN 1 AND 10000
          AND ${table.amountMinor} IS NULL)
        OR (${table.valueType} = 'FIXED_AMOUNT'
          AND ${table.percentageBps} IS NULL
          AND ${table.amountMinor} > 0)`,
    ),
    check(
      "discount_amount_off_maximum_check",
      sql`${table.maximumDiscountMinor} IS NULL OR ${table.maximumDiscountMinor} > 0`,
    ),
    index("discount_amount_off_store_idx").on(
      table.storeId,
      table.discountId,
    ),
  ],
);

export const discountBuyXGetY = pricingSchema.table(
  "discount_buy_x_get_y",
  {
    discountId: uuid("discount_id")
      .primaryKey()
      .references(() => discount.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    requirementType: discountRequirementTypeEnum("requirement_type").notNull(),
    requiredQuantity: integer("required_quantity"),
    requiredSubtotalMinor: bigint("required_subtotal_minor", {
      mode: "bigint",
    }),
    benefitQuantity: integer("benefit_quantity").notNull(),
    benefitValueType: discountValueTypeEnum("benefit_value_type").notNull(),
    benefitPercentageBps: smallint("benefit_percentage_bps"),
    benefitAmountMinor: bigint("benefit_amount_minor", { mode: "bigint" }),
    usesPerOrderLimit: integer("uses_per_order_limit"),
  },
  (table) => [
    check(
      "discount_buy_x_get_y_requirement_check",
      sql`(${table.requirementType} = 'QUANTITY'
          AND ${table.requiredQuantity} > 0
          AND ${table.requiredSubtotalMinor} IS NULL)
        OR (${table.requirementType} = 'SUBTOTAL'
          AND ${table.requiredQuantity} IS NULL
          AND ${table.requiredSubtotalMinor} > 0)`,
    ),
    check(
      "discount_buy_x_get_y_benefit_quantity_check",
      sql`${table.benefitQuantity} > 0`,
    ),
    check(
      "discount_buy_x_get_y_benefit_check",
      sql`(${table.benefitValueType} = 'PERCENTAGE'
          AND ${table.benefitPercentageBps} BETWEEN 1 AND 10000
          AND ${table.benefitAmountMinor} IS NULL)
        OR (${table.benefitValueType} = 'FIXED_AMOUNT'
          AND ${table.benefitPercentageBps} IS NULL
          AND ${table.benefitAmountMinor} > 0)
        OR (${table.benefitValueType} = 'FREE'
          AND ${table.benefitPercentageBps} IS NULL
          AND ${table.benefitAmountMinor} IS NULL)`,
    ),
    check(
      "discount_buy_x_get_y_uses_per_order_check",
      sql`${table.usesPerOrderLimit} IS NULL OR ${table.usesPerOrderLimit} > 0`,
    ),
    index("discount_buy_x_get_y_store_idx").on(
      table.storeId,
      table.discountId,
    ),
  ],
);

export const discountFreeShipping = pricingSchema.table(
  "discount_free_shipping",
  {
    discountId: uuid("discount_id")
      .primaryKey()
      .references(() => discount.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    maximumShippingPriceMinor: bigint("maximum_shipping_price_minor", {
      mode: "bigint",
    }),
  },
  (table) => [
    check(
      "discount_free_shipping_maximum_price_check",
      sql`${table.maximumShippingPriceMinor} IS NULL OR ${table.maximumShippingPriceMinor} >= 0`,
    ),
    index("discount_free_shipping_store_idx").on(
      table.storeId,
      table.discountId,
    ),
  ],
);

export const discountMinimumRequirement = pricingSchema.table(
  "discount_minimum_requirement",
  {
    discountId: uuid("discount_id")
      .primaryKey()
      .references(() => discount.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    requirementType: discountRequirementTypeEnum("requirement_type").notNull(),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }),
    quantity: integer("quantity"),
  },
  (table) => [
    check(
      "discount_minimum_requirement_value_check",
      sql`(${table.requirementType} = 'SUBTOTAL'
          AND ${table.subtotalMinor} > 0
          AND ${table.quantity} IS NULL)
        OR (${table.requirementType} = 'QUANTITY'
          AND ${table.subtotalMinor} IS NULL
          AND ${table.quantity} > 0)`,
    ),
    index("discount_minimum_requirement_store_idx").on(
      table.storeId,
      table.discountId,
    ),
  ],
);

export type DiscountAmountOff = typeof discountAmountOff.$inferSelect;
export type NewDiscountAmountOff = typeof discountAmountOff.$inferInsert;
export type DiscountBuyXGetY = typeof discountBuyXGetY.$inferSelect;
export type NewDiscountBuyXGetY = typeof discountBuyXGetY.$inferInsert;
export type DiscountFreeShipping = typeof discountFreeShipping.$inferSelect;
export type NewDiscountFreeShipping = typeof discountFreeShipping.$inferInsert;
export type DiscountMinimumRequirement =
  typeof discountMinimumRequirement.$inferSelect;
export type NewDiscountMinimumRequirement =
  typeof discountMinimumRequirement.$inferInsert;
