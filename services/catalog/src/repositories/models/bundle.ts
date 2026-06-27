import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productOption, productOptionValue } from "./options";
import { currencyEnum } from "./pricing";
import { product, variant } from "./products";
import { catalogSchema } from "./schema";

// ==============================
// Bundle Root
// ==============================

export const bundle = catalogSchema.table(
  "bundle",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }),
    displayStyle: varchar("display_style", { length: 32 })
      .notNull()
      .default("ACCORDION"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("bundle_product_id_unique").on(table.productId),
    index("idx_bundle_project_id").on(table.projectId),
    check(
      "bundle_display_style_check",
      sql`${table.displayStyle} IN ('ACCORDION', 'TABS', 'FLAT', 'WIZARD')`
    ),
  ]
);

export const bundleConfiguration = catalogSchema.table(
  "bundle_configuration",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundle.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_configuration_bundle_id").on(table.bundleId),
  ]
);

export const bundleConfigurationVariant = catalogSchema.table(
  "bundle_configuration_variant",
  {
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.configurationId, table.variantId] }),
    uniqueIndex("bundle_configuration_variant_unique").on(table.variantId),
    index("idx_bundle_configuration_variant_project_id").on(table.projectId),
  ]
);

// ==============================
// Bundle Price Rules
// ==============================

export const bundlePriceRule = catalogSchema.table(
  "bundle_price_rule",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    priceType: varchar("price_type", { length: 32 }).notNull(),
  },
  (table) => [
    index("idx_bundle_price_rule_configuration_id").on(table.configurationId),
  ]
);

export const bundlePriceRuleAmount = catalogSchema.table(
  "bundle_price_rule_amount",
  {
    projectId: uuid("project_id").notNull(),
    priceRuleId: uuid("price_rule_id")
      .notNull()
      .references(() => bundlePriceRule.id, { onDelete: "cascade" }),
    currency: currencyEnum("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.priceRuleId, table.currency] }),
    index("idx_bundle_price_rule_amount_project_currency").on(
      table.projectId,
      table.currency
    ),
    check(
      "bundle_price_rule_amount_minor_check",
      sql`${table.amountMinor} >= 0`
    ),
  ]
);

export const bundlePriceRulePercent = catalogSchema.table(
  "bundle_price_rule_percent",
  {
    projectId: uuid("project_id").notNull(),
    priceRuleId: uuid("price_rule_id")
      .primaryKey()
      .references(() => bundlePriceRule.id, { onDelete: "cascade" }),
    percentValue: integer("percent_value").notNull(),
  },
  (table) => [
    index("idx_bundle_price_rule_percent_project_id").on(table.projectId),
    check(
      "bundle_price_rule_percent_value_check",
      sql`${table.percentValue} >= 0 AND ${table.percentValue} <= 100`
    ),
  ]
);

export const bundlePricingTemplate = catalogSchema.table(
  "bundle_pricing_template",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    priceRuleId: uuid("price_rule_id")
      .notNull()
      .references(() => bundlePriceRule.id, { onDelete: "restrict" }),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_bundle_pricing_template_configuration_id").on(
      table.configurationId
    ),
    index("idx_bundle_pricing_template_price_rule_id").on(table.priceRuleId),
  ]
);

// ==============================
// Bundle Groups
// ==============================

export const bundleGroup = catalogSchema.table(
  "bundle_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    sortIndex: integer("sort_index").notNull().default(0),
    minSelection: integer("min_selection"),
    maxSelection: integer("max_selection"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_group_configuration_id").on(table.configurationId),
    index("idx_bundle_group_sort").on(table.configurationId, table.sortIndex),
    check(
      "bundle_group_selection_check",
      sql`(
        (${table.minSelection} IS NULL OR ${table.minSelection} >= 0)
        AND
        (${table.maxSelection} IS NULL OR ${table.maxSelection} >= 0)
        AND
        (${table.minSelection} IS NULL OR ${table.maxSelection} IS NULL OR ${table.maxSelection} >= ${table.minSelection})
      )`
    ),
  ]
);

export const bundleGroupTranslation = catalogSchema.table(
  "bundle_group_translation",
  {
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => bundleGroup.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.locale] }),
    index("idx_bundle_group_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

// ==============================
// Bundle Items
// ==============================

export const bundleItem = catalogSchema.table(
  "bundle_item",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => bundleGroup.id, { onDelete: "cascade" }),
    itemType: varchar("item_type", { length: 32 }).notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    refProductId: uuid("ref_product_id"),
    refVariantId: uuid("ref_variant_id"),
    featuredImageId: uuid("featured_image_id"),
    minQty: integer("min_qty").default(1),
    maxQty: integer("max_qty"),
    defaultQty: integer("default_qty").default(1),
    priceRuleId: uuid("price_rule_id").references(() => bundlePriceRule.id, {
      onDelete: "set null",
    }),
    pricingTemplateId: uuid("pricing_template_id").references(
      () => bundlePricingTemplate.id,
      { onDelete: "set null" }
    ),
    visible: boolean("visible").notNull().default(true),
    selected: boolean("selected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_item_group_id").on(table.groupId),
    index("idx_bundle_item_ref_product_id").on(table.refProductId),
    index("idx_bundle_item_ref_variant_id").on(table.refVariantId),
    index("idx_bundle_item_sort").on(table.groupId, table.sortIndex),
    index("idx_bundle_item_price_rule_id").on(table.priceRuleId),
    check(
      "bundle_item_quantity_check",
      sql`(
        (${table.minQty} IS NULL OR ${table.minQty} >= 0)
        AND
        (${table.defaultQty} IS NULL OR ${table.minQty} IS NULL OR ${table.defaultQty} >= ${table.minQty})
        AND
        (${table.defaultQty} IS NULL OR ${table.maxQty} IS NULL OR ${table.defaultQty} <= ${table.maxQty})
        AND
        (${table.maxQty} IS NULL OR ${table.minQty} IS NULL OR ${table.maxQty} >= ${table.minQty})
      )`
    ),
    check(
      "bundle_item_reference_check",
      sql`(
        (${table.itemType} = 'PRODUCT' AND ${table.refProductId} IS NOT NULL AND ${table.refVariantId} IS NULL)
        OR
        (${table.itemType} = 'VARIANT' AND ${table.refVariantId} IS NOT NULL AND ${table.refProductId} IS NULL)
      )`
    ),
    check(
      "bundle_item_pricing_source_check",
      sql`NOT (${table.pricingTemplateId} IS NOT NULL AND ${table.priceRuleId} IS NOT NULL)`
    ),
  ]
);

export const bundleItemOptionSelection = catalogSchema.table(
  "bundle_item_option_selection",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => bundleItem.id, { onDelete: "cascade" }),
    refOptionId: uuid("ref_option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    parentOptionId: uuid("parent_option_id").references(() => productOption.id, {
      onDelete: "set null",
    }),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_item_option_selection_item_id").on(table.itemId),
    index("idx_bundle_item_option_selection_ref_option_id").on(
      table.refOptionId
    ),
    index("idx_bundle_item_option_selection_parent_option_id").on(
      table.parentOptionId
    ),
    uniqueIndex("bundle_item_option_selection_item_option_unique").on(
      table.itemId,
      table.refOptionId
    ),
  ]
);

export const bundleItemOptionValueSelection = catalogSchema.table(
  "bundle_item_option_value_selection",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    optionSelectionId: uuid("option_selection_id")
      .notNull()
      .references(() => bundleItemOptionSelection.id, { onDelete: "cascade" }),
    refOptionValueId: uuid("ref_option_value_id").references(
      () => productOptionValue.id,
      { onDelete: "set null" }
    ),
    value: text("value").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("SELECTED"),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_item_option_value_selection_option_id").on(
      table.optionSelectionId
    ),
    index("idx_bundle_item_option_value_selection_ref_value_id").on(
      table.refOptionValueId
    ),
    index("idx_bundle_item_option_value_selection_status").on(
      table.optionSelectionId,
      table.status
    ),
    uniqueIndex("bundle_item_option_value_selection_value_unique").on(
      table.optionSelectionId,
      table.value
    ),
  ]
);

export const bundleItemTranslation = catalogSchema.table(
  "bundle_item_translation",
  {
    projectId: uuid("project_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => bundleItem.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.locale] }),
    index("idx_bundle_item_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

// ==============================
// Dependency Rules
// ==============================

export const dependencyRule = catalogSchema.table(
  "dependency_rule",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_dependency_rule_configuration_id").on(table.configurationId),
    index("idx_dependency_rule_priority").on(
      table.configurationId,
      table.priority
    ),
  ]
);

export const conditionGroup = catalogSchema.table(
  "condition_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => dependencyRule.id, { onDelete: "cascade" }),
    logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND"),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_condition_group_rule_id").on(table.ruleId),
  ]
);

export const condition = catalogSchema.table(
  "condition",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => conditionGroup.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 32 }).notNull(),
    subject: varchar("subject", { length: 32 }).notNull(),
    operator: varchar("operator", { length: 32 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: uuid("target_id").notNull(),
    value: integer("value"),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_condition_group_id").on(table.groupId),
    index("idx_condition_target").on(table.targetType, table.targetId),
  ]
);

export const dependencyAction = catalogSchema.table(
  "dependency_action",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => dependencyRule.id, { onDelete: "cascade" }),
    actionType: varchar("action_type", { length: 32 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: uuid("target_id"),
    requiredValue: boolean("required_value"),
    priceRuleId: uuid("price_rule_id").references(() => bundlePriceRule.id, {
      onDelete: "restrict",
    }),
    stackable: boolean("stackable").notNull().default(false),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_dependency_action_rule_id").on(table.ruleId),
    index("idx_dependency_action_target").on(table.targetType, table.targetId),
    index("idx_dependency_action_price_rule_id").on(table.priceRuleId),
    check(
      "dependency_action_price_rule_check",
      sql`(
        (${table.actionType} = 'ADJUST_PRICE' AND ${table.priceRuleId} IS NOT NULL)
        OR
        (${table.actionType} <> 'ADJUST_PRICE' AND ${table.priceRuleId} IS NULL)
      )`
    ),
  ]
);

// ==============================
// Type Exports
// ==============================

export type Bundle = typeof bundle.$inferSelect;
export type NewBundle = typeof bundle.$inferInsert;
export type BundleConfiguration = typeof bundleConfiguration.$inferSelect;
export type NewBundleConfiguration = typeof bundleConfiguration.$inferInsert;
export type BundleConfigurationVariant =
  typeof bundleConfigurationVariant.$inferSelect;
export type NewBundleConfigurationVariant =
  typeof bundleConfigurationVariant.$inferInsert;
export type BundlePriceRule = typeof bundlePriceRule.$inferSelect;
export type NewBundlePriceRule = typeof bundlePriceRule.$inferInsert;
export type BundlePriceRuleAmount = typeof bundlePriceRuleAmount.$inferSelect;
export type NewBundlePriceRuleAmount = typeof bundlePriceRuleAmount.$inferInsert;
export type BundlePriceRulePercent = typeof bundlePriceRulePercent.$inferSelect;
export type NewBundlePriceRulePercent = typeof bundlePriceRulePercent.$inferInsert;
export type BundlePricingTemplate = typeof bundlePricingTemplate.$inferSelect;
export type NewBundlePricingTemplate = typeof bundlePricingTemplate.$inferInsert;
export type BundleGroup = typeof bundleGroup.$inferSelect;
export type NewBundleGroup = typeof bundleGroup.$inferInsert;
export type BundleGroupTranslation = typeof bundleGroupTranslation.$inferSelect;
export type NewBundleGroupTranslation = typeof bundleGroupTranslation.$inferInsert;
export type BundleItem = typeof bundleItem.$inferSelect;
export type NewBundleItem = typeof bundleItem.$inferInsert;
export type BundleItemOptionSelection =
  typeof bundleItemOptionSelection.$inferSelect;
export type NewBundleItemOptionSelection =
  typeof bundleItemOptionSelection.$inferInsert;
export type BundleItemOptionValueSelection =
  typeof bundleItemOptionValueSelection.$inferSelect;
export type NewBundleItemOptionValueSelection =
  typeof bundleItemOptionValueSelection.$inferInsert;
export type BundleItemTranslation = typeof bundleItemTranslation.$inferSelect;
export type NewBundleItemTranslation = typeof bundleItemTranslation.$inferInsert;
export type DependencyRule = typeof dependencyRule.$inferSelect;
export type NewDependencyRule = typeof dependencyRule.$inferInsert;
export type ConditionGroup = typeof conditionGroup.$inferSelect;
export type NewConditionGroup = typeof conditionGroup.$inferInsert;
export type Condition = typeof condition.$inferSelect;
export type NewCondition = typeof condition.$inferInsert;
export type DependencyAction = typeof dependencyAction.$inferSelect;
export type NewDependencyAction = typeof dependencyAction.$inferInsert;
