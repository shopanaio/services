import {
  bigint,
  boolean,
  integer,
  jsonb,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  currencyCodeEnum,
  discountCalculationStrategyEnum,
  discountAllocationMethodEnum,
  discountBenefitStrategyEnum,
  discountBuyerContextTypeEnum,
  discountClassEnum,
  discountCodeStatusEnum,
  discountEffectiveStatusEnum,
  discountKindEnum,
  discountMethodEnum,
  discountRequirementTypeEnum,
  discountStateEnum,
  priceAdjustmentOperationEnum,
  priceAdjustmentValueTypeEnum,
  pricingSchema,
} from "./schema.js";

export interface DiscountTargetSelectionItem {
  role: "QUALIFIER" | "BENEFIT";
  targetType: "ALL_PRODUCTS" | "PRODUCTS" | "VARIANTS" | "CATEGORIES";
  targetIds: string[];
}

export interface DiscountCodeItem {
  id: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
  usageLimit: number | null;
}

export interface DiscountChannelItem {
  code: string;
  featured: boolean;
}

const discountListColumns = {
  storeId: uuid("store_id").notNull(),
  id: uuid("id").notNull(),
  method: discountMethodEnum("method").notNull(),
  calculationStrategy: discountCalculationStrategyEnum("calculation_strategy").notNull(),
  kind: discountKindEnum("kind"),
  discountClass: discountClassEnum("discount_class").notNull(),
  state: discountStateEnum("state").notNull(),
  effectiveStatus: discountEffectiveStatusEnum("effective_status").notNull(),
  title: varchar("title", { length: 255 }),
  primaryCode: varchar("primary_code", { length: 255 }),
  searchCodes: text("search_codes"),
  codesCount: integer("codes_count").notNull(),
  currency: currencyCodeEnum("currency").notNull(),
  priority: integer("priority").notNull(),
  usageLimit: bigint("usage_limit", { mode: "bigint" }),
  appliesOncePerCustomer: boolean("applies_once_per_customer").notNull(),
  appliesOnOneTimePurchase: boolean("applies_on_one_time_purchase").notNull(),
  appliesOnSubscription: boolean("applies_on_subscription").notNull(),
  startsAt: timestamp("starts_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
  revision: integer("revision").notNull(),
  reservedUsageCount: bigint("reserved_usage_count", {
    mode: "bigint",
  }).notNull(),
  usageCount: bigint("usage_count", { mode: "bigint" }).notNull(),
  tags: text("tags").array().notNull(),
  channelCodes: text("channel_codes").array().notNull(),
  featuredChannelCodes: text("featured_channel_codes").array().notNull(),
  searchTags: text("search_tags").notNull(),
  searchChannelCodes: text("search_channel_codes").notNull(),
  searchFeaturedChannelCodes: text("search_featured_channel_codes").notNull(),
  combinesWithProductDiscounts: boolean("combines_with_product_discounts").notNull(),
  combinesWithOrderDiscounts: boolean("combines_with_order_discounts").notNull(),
  combinesWithShippingDiscounts: boolean("combines_with_shipping_discounts").notNull(),
  createdById: text("created_by_id"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  archivedAt: timestamp("archived_at", {
    withTimezone: true,
    mode: "string",
  }),
};

export const discountListView = pricingSchema
  .view("discount_list_view", discountListColumns)
  .existing();

export const discountConfigurationView = pricingSchema
  .view("discount_configuration_view", {
    ...discountListColumns,
    amountOffOperation: priceAdjustmentOperationEnum("amount_off_operation"),
    amountOffValueType: priceAdjustmentValueTypeEnum("amount_off_value_type"),
    amountOffPercentageBps: smallint("amount_off_percentage_bps"),
    amountOffAmountMinor: bigint("amount_off_amount_minor", {
      mode: "bigint",
    }),
    amountOffAllocationMethod: discountAllocationMethodEnum("amount_off_allocation_method"),
    maximumDiscountMinor: bigint("maximum_discount_minor", {
      mode: "bigint",
    }),
    buyRequirementType: discountRequirementTypeEnum("buy_requirement_type"),
    buyRequiredQuantity: integer("buy_required_quantity"),
    buyRequiredSubtotalMinor: bigint("buy_required_subtotal_minor", {
      mode: "bigint",
    }),
    benefitQuantity: integer("benefit_quantity"),
    benefitStrategy: discountBenefitStrategyEnum("benefit_strategy"),
    benefitOperation: priceAdjustmentOperationEnum("benefit_operation"),
    benefitValueType: priceAdjustmentValueTypeEnum("benefit_value_type"),
    benefitPercentageBps: smallint("benefit_percentage_bps"),
    benefitAmountMinor: bigint("benefit_amount_minor", { mode: "bigint" }),
    usesPerOrderLimit: integer("uses_per_order_limit"),
    maximumShippingPriceMinor: bigint("maximum_shipping_price_minor", {
      mode: "bigint",
    }),
    minimumRequirementType: discountRequirementTypeEnum("minimum_requirement_type"),
    minimumSubtotalMinor: bigint("minimum_subtotal_minor", {
      mode: "bigint",
    }),
    minimumQuantity: integer("minimum_quantity"),
    buyerContextType: discountBuyerContextTypeEnum("buyer_context_type"),
    targetSelections: jsonb("target_selections").$type<DiscountTargetSelectionItem[]>().notNull(),
    eligibleCustomerIds: uuid("eligible_customer_ids").array().notNull(),
    eligibleSegmentIds: uuid("eligible_segment_ids").array().notNull(),
    codes: jsonb("codes").$type<DiscountCodeItem[]>().notNull(),
    channels: jsonb("channels").$type<DiscountChannelItem[]>().notNull(),
  })
  .existing();

export const discountUsageSummaryView = pricingSchema
  .view("discount_usage_summary_view", {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id").notNull(),
    usageLimit: bigint("usage_limit", { mode: "bigint" }),
    reservedCount: bigint("reserved_count", { mode: "bigint" }).notNull(),
    committedCount: bigint("committed_count", { mode: "bigint" }).notNull(),
    reversedCount: bigint("reversed_count", { mode: "bigint" }).notNull(),
    netCommittedCount: bigint("net_committed_count", {
      mode: "bigint",
    }).notNull(),
    consumedCount: bigint("consumed_count", { mode: "bigint" }).notNull(),
    remainingCount: bigint("remaining_count", { mode: "bigint" }),
    version: bigint("version", { mode: "bigint" }),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }),
  })
  .existing();

export const discountCodeListView = pricingSchema
  .view("discount_code_list_view", {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").notNull(),
    discountId: uuid("discount_id").notNull(),
    code: varchar("code", { length: 255 }).notNull(),
    normalizedCode: varchar("normalized_code", { length: 255 }),
    status: discountCodeStatusEnum("status").notNull(),
    usageLimit: bigint("usage_limit", { mode: "bigint" }),
    reservedCount: bigint("reserved_count", { mode: "bigint" }).notNull(),
    committedCount: bigint("committed_count", { mode: "bigint" }).notNull(),
    reversedCount: bigint("reversed_count", { mode: "bigint" }).notNull(),
    usageCount: bigint("usage_count", { mode: "bigint" }).notNull(),
    remainingCount: bigint("remaining_count", { mode: "bigint" }),
    metadata: jsonb("metadata").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    disabledAt: timestamp("disabled_at", {
      withTimezone: true,
      mode: "string",
    }),
  })
  .existing();

export type DiscountListView = typeof discountListView.$inferSelect;
export type DiscountConfigurationView = typeof discountConfigurationView.$inferSelect;
export type DiscountUsageSummaryView = typeof discountUsageSummaryView.$inferSelect;
export type DiscountCodeListView = typeof discountCodeListView.$inferSelect;
