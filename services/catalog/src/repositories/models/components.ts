import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productOption, productOptionValue } from "./options";
import { currencyEnum } from "./pricing";
import { product, variant } from "./products";
import {
  catalogSchema,
  componentPriceStrategyEnum,
  componentTargetKindEnum,
  localeCodeEnum,
  priceAdjustmentOperationEnum,
  priceAdjustmentValueTypeEnum,
} from "./schema";

export const component = catalogSchema.table(
  "component",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    displayStyle: varchar("display_style", { length: 32 }).notNull().default("ACCORDION"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("component_product_id_unique").on(table.productId),
    check(
      "component_display_style_check",
      sql`${table.displayStyle} IN ('ACCORDION', 'TABS', 'FLAT', 'WIZARD')`,
    ),
    index("idx_component_store_id").on(table.storeId),
  ],
);

export const componentConfiguration = catalogSchema.table(
  "component_configuration",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => component.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_component_configuration_component_id").on(table.componentId)],
);

export const componentTarget = catalogSchema.table(
  "component_target",
  {
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => componentConfiguration.id, { onDelete: "cascade" }),
    id: uuid("id").notNull(),
    kind: componentTargetKindEnum("kind").notNull(),
    parentId: uuid("parent_id"),
    parentKind: componentTargetKindEnum("parent_kind"),
  },
  (table) => [
    primaryKey({ columns: [table.configurationId, table.id] }),
    unique("component_target_identity_kind_unique").on(table.configurationId, table.id, table.kind),
    unique("component_target_item_parent_unique").on(
      table.configurationId,
      table.id,
      table.kind,
      table.parentId,
    ),
    check(
      "component_target_hierarchy_check",
      sql`(
          ${table.kind} = 'CONFIGURATION'
          AND ${table.parentId} IS NULL
          AND ${table.parentKind} IS NULL
        )
        OR (
          ${table.kind} = 'GROUP'
          AND ${table.parentId} IS NOT NULL
          AND ${table.parentKind} = 'CONFIGURATION'
        )
        OR (
          ${table.kind} = 'ITEM'
          AND ${table.parentId} IS NOT NULL
          AND ${table.parentKind} = 'GROUP'
        )`,
    ),
    foreignKey({
      name: "component_target_parent_fk",
      columns: [table.configurationId, table.parentId, table.parentKind],
      foreignColumns: [table.configurationId, table.id, table.kind],
    }).onDelete("cascade"),
    uniqueIndex("component_target_configuration_root_unique")
      .on(table.configurationId)
      .where(sql`${table.kind} = 'CONFIGURATION'`),
    index("idx_component_target_parent").on(table.configurationId, table.parentId),
  ],
);

export const componentConfigurationTarget = catalogSchema.table(
  "component_configuration_target",
  {
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id").notNull(),
    id: uuid("id").notNull(),
    kind: componentTargetKindEnum("kind").notNull().default("CONFIGURATION"),
  },
  (table) => [
    primaryKey({ columns: [table.configurationId, table.id] }),
    unique("component_configuration_target_configuration_unique").on(table.configurationId),
    check(
      "component_configuration_target_identity_check",
      sql`${table.kind} = 'CONFIGURATION'
        AND ${table.id} = ${table.configurationId}`,
    ),
    foreignKey({
      name: "component_configuration_target_registry_fk",
      columns: [table.configurationId, table.id, table.kind],
      foreignColumns: [componentTarget.configurationId, componentTarget.id, componentTarget.kind],
    }).onDelete("cascade"),
  ],
);

export const componentConfigurationVariant = catalogSchema.table(
  "component_configuration_variant",
  {
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => componentConfiguration.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.configurationId, table.variantId] }),
    uniqueIndex("component_configuration_variant_unique").on(table.variantId),
    index("idx_component_configuration_variant_store_id").on(table.storeId),
  ],
);

export const componentPriceRule = catalogSchema.table(
  "component_price_rule",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => componentConfiguration.id, { onDelete: "cascade" }),
    strategy: componentPriceStrategyEnum("strategy").notNull(),
    operation: priceAdjustmentOperationEnum("operation"),
    valueType: priceAdjustmentValueTypeEnum("value_type"),
  },
  (table) => [
    check(
      "component_price_rule_shape_check",
      sql`(
          ${table.strategy} = 'ADJUSTMENT'
          AND ${table.operation} IS NOT NULL
          AND ${table.valueType} IS NOT NULL
        ) OR (
          ${table.strategy} IN ('BASE', 'OVERRIDE', 'FREE')
          AND ${table.operation} IS NULL
          AND ${table.valueType} IS NULL
        )`,
    ),
    index("idx_component_price_rule_configuration_id").on(table.configurationId),
  ],
);

export const componentPriceRuleAmount = catalogSchema.table(
  "component_price_rule_amount",
  {
    storeId: uuid("store_id").notNull(),
    priceRuleId: uuid("price_rule_id")
      .notNull()
      .references(() => componentPriceRule.id, { onDelete: "cascade" }),
    currency: currencyEnum("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.priceRuleId, table.currency] }),
    check("component_price_rule_amount_minor_check", sql`${table.amountMinor} > 0`),
    index("idx_component_price_rule_amount_store_currency").on(table.storeId, table.currency),
  ],
);

export const componentPriceRulePercent = catalogSchema.table(
  "component_price_rule_percent",
  {
    storeId: uuid("store_id").notNull(),
    priceRuleId: uuid("price_rule_id")
      .primaryKey()
      .references(() => componentPriceRule.id, { onDelete: "cascade" }),
    percentageBps: smallint("percentage_bps").notNull(),
  },
  (table) => [
    check(
      "component_price_rule_percentage_bps_check",
      sql`${table.percentageBps} BETWEEN 1 AND 10000`,
    ),
    index("idx_component_price_rule_percent_store_id").on(table.storeId),
  ],
);

export const componentPricingTemplate = catalogSchema.table(
  "component_pricing_template",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => componentConfiguration.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    priceRuleId: uuid("price_rule_id")
      .notNull()
      .references(() => componentPriceRule.id, { onDelete: "restrict" }),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_component_pricing_template_configuration_id").on(table.configurationId),
    index("idx_component_pricing_template_price_rule_id").on(table.priceRuleId),
  ],
);

export const componentGroup = catalogSchema.table(
  "component_group",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => componentConfiguration.id, { onDelete: "cascade" }),
    targetKind: componentTargetKindEnum("target_kind").notNull().default("GROUP"),
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
    unique("component_group_configuration_id_id_unique").on(table.configurationId, table.id),
    check("component_group_target_kind_check", sql`${table.targetKind} = 'GROUP'`),
    foreignKey({
      name: "component_group_target_fk",
      columns: [table.configurationId, table.id, table.targetKind],
      foreignColumns: [componentTarget.configurationId, componentTarget.id, componentTarget.kind],
    }).onDelete("cascade"),
    check(
      "component_group_selection_check",
      sql`(${table.minSelection} IS NULL OR ${table.minSelection} >= 0)
        AND (${table.maxSelection} IS NULL OR ${table.maxSelection} >= 0)
        AND (
          ${table.minSelection} IS NULL
          OR ${table.maxSelection} IS NULL
          OR ${table.maxSelection} >= ${table.minSelection}
        )`,
    ),
    index("idx_component_group_configuration_id").on(table.configurationId),
    index("idx_component_group_sort").on(table.configurationId, table.sortIndex),
  ],
);

export const componentGroupTranslation = catalogSchema.table(
  "component_group_translation",
  {
    storeId: uuid("store_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => componentGroup.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.locale] }),
    index("idx_component_group_translation_store_locale").on(table.storeId, table.locale),
  ],
);

export const componentItem = catalogSchema.table(
  "component_item",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id").notNull(),
    groupId: uuid("group_id").notNull(),
    targetKind: componentTargetKindEnum("target_kind").notNull().default("ITEM"),
    itemType: varchar("item_type", { length: 32 }).notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    refProductId: uuid("ref_product_id"),
    refVariantId: uuid("ref_variant_id"),
    featuredImageId: uuid("featured_image_id"),
    minQty: integer("min_qty").default(1),
    maxQty: integer("max_qty"),
    defaultQty: integer("default_qty").default(1),
    priceRuleId: uuid("price_rule_id").references(() => componentPriceRule.id, {
      onDelete: "set null",
    }),
    pricingTemplateId: uuid("pricing_template_id").references(() => componentPricingTemplate.id, {
      onDelete: "set null",
    }),
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
    check("component_item_target_kind_check", sql`${table.targetKind} = 'ITEM'`),
    foreignKey({
      name: "component_item_group_fk",
      columns: [table.configurationId, table.groupId],
      foreignColumns: [componentGroup.configurationId, componentGroup.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "component_item_target_fk",
      columns: [table.configurationId, table.id, table.targetKind, table.groupId],
      foreignColumns: [
        componentTarget.configurationId,
        componentTarget.id,
        componentTarget.kind,
        componentTarget.parentId,
      ],
    }).onDelete("cascade"),
    check(
      "component_item_quantity_check",
      sql`(${table.minQty} IS NULL OR ${table.minQty} >= 0)
        AND (
          ${table.defaultQty} IS NULL
          OR ${table.minQty} IS NULL
          OR ${table.defaultQty} >= ${table.minQty}
        )
        AND (
          ${table.defaultQty} IS NULL
          OR ${table.maxQty} IS NULL
          OR ${table.defaultQty} <= ${table.maxQty}
        )
        AND (
          ${table.maxQty} IS NULL
          OR ${table.minQty} IS NULL
          OR ${table.maxQty} >= ${table.minQty}
        )`,
    ),
    check(
      "component_item_reference_check",
      sql`(
          ${table.itemType} = 'PRODUCT'
          AND ${table.refProductId} IS NOT NULL
          AND ${table.refVariantId} IS NULL
        )
        OR (
          ${table.itemType} = 'VARIANT'
          AND ${table.refVariantId} IS NOT NULL
          AND ${table.refProductId} IS NULL
        )`,
    ),
    check(
      "component_item_pricing_source_check",
      sql`NOT (
        ${table.pricingTemplateId} IS NOT NULL
        AND ${table.priceRuleId} IS NOT NULL
      )`,
    ),
    index("idx_component_item_group_id").on(table.groupId),
    index("idx_component_item_ref_product_id").on(table.refProductId),
    index("idx_component_item_ref_variant_id").on(table.refVariantId),
    index("idx_component_item_sort").on(table.groupId, table.sortIndex),
    index("idx_component_item_price_rule_id").on(table.priceRuleId),
  ],
);

export const componentItemOptionSelection = catalogSchema.table(
  "component_item_option_selection",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => componentItem.id, { onDelete: "cascade" }),
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
    uniqueIndex("component_item_option_selection_item_option_unique").on(
      table.itemId,
      table.refOptionId,
    ),
    index("idx_component_item_option_selection_item_id").on(table.itemId),
    index("idx_component_item_option_selection_ref_option_id").on(table.refOptionId),
    index("idx_component_item_option_selection_parent_option_id").on(table.parentOptionId),
  ],
);

export const componentItemOptionValueSelection = catalogSchema.table(
  "component_item_option_value_selection",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    optionSelectionId: uuid("option_selection_id")
      .notNull()
      .references(() => componentItemOptionSelection.id, {
        onDelete: "cascade",
      }),
    refOptionValueId: uuid("ref_option_value_id").references(() => productOptionValue.id, {
      onDelete: "set null",
    }),
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
    uniqueIndex("component_item_option_value_selection_value_unique").on(
      table.optionSelectionId,
      table.value,
    ),
    index("idx_component_item_option_value_selection_option_id").on(table.optionSelectionId),
    index("idx_component_item_option_value_selection_ref_value_id").on(table.refOptionValueId),
    index("idx_component_item_option_value_selection_status").on(
      table.optionSelectionId,
      table.status,
    ),
  ],
);

export const componentItemTranslation = catalogSchema.table(
  "component_item_translation",
  {
    storeId: uuid("store_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => componentItem.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.locale] }),
    index("idx_component_item_translation_store_locale").on(table.storeId, table.locale),
  ],
);

export const dependencyRule = catalogSchema.table(
  "dependency_rule",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => componentConfiguration.id, { onDelete: "cascade" }),
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
    unique("dependency_rule_configuration_id_id_unique").on(table.configurationId, table.id),
    index("idx_dependency_rule_configuration_id").on(table.configurationId),
    index("idx_dependency_rule_priority").on(table.configurationId, table.priority),
  ],
);

export const conditionGroup = catalogSchema.table(
  "condition_group",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id").notNull(),
    ruleId: uuid("rule_id").notNull(),
    logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND"),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    unique("condition_group_configuration_id_id_unique").on(table.configurationId, table.id),
    foreignKey({
      name: "condition_group_rule_fk",
      columns: [table.configurationId, table.ruleId],
      foreignColumns: [dependencyRule.configurationId, dependencyRule.id],
    }).onDelete("cascade"),
    index("idx_condition_group_rule_id").on(table.ruleId),
  ],
);

export const condition = catalogSchema.table(
  "condition",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id").notNull(),
    groupId: uuid("group_id").notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    subject: varchar("subject", { length: 32 }).notNull(),
    operator: varchar("operator", { length: 32 }).notNull(),
    targetType: componentTargetKindEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    value: integer("value"),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    foreignKey({
      name: "condition_group_fk",
      columns: [table.configurationId, table.groupId],
      foreignColumns: [conditionGroup.configurationId, conditionGroup.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "condition_target_fk",
      columns: [table.configurationId, table.targetId, table.targetType],
      foreignColumns: [componentTarget.configurationId, componentTarget.id, componentTarget.kind],
    }).onDelete("cascade"),
    index("idx_condition_group_id").on(table.groupId),
    index("idx_condition_target").on(table.configurationId, table.targetId, table.targetType),
  ],
);

export const dependencyAction = catalogSchema.table(
  "dependency_action",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    configurationId: uuid("configuration_id").notNull(),
    ruleId: uuid("rule_id").notNull(),
    actionType: varchar("action_type", { length: 32 }).notNull(),
    targetType: componentTargetKindEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    requiredValue: boolean("required_value"),
    priceRuleId: uuid("price_rule_id").references(() => componentPriceRule.id, {
      onDelete: "restrict",
    }),
    stackable: boolean("stackable").notNull().default(false),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    foreignKey({
      name: "dependency_action_rule_fk",
      columns: [table.configurationId, table.ruleId],
      foreignColumns: [dependencyRule.configurationId, dependencyRule.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "dependency_action_target_fk",
      columns: [table.configurationId, table.targetId, table.targetType],
      foreignColumns: [componentTarget.configurationId, componentTarget.id, componentTarget.kind],
    }).onDelete("cascade"),
    check(
      "dependency_action_price_rule_check",
      sql`(
          ${table.actionType} = 'ADJUST_PRICE'
          AND ${table.priceRuleId} IS NOT NULL
        )
        OR (
          ${table.actionType} <> 'ADJUST_PRICE'
          AND ${table.priceRuleId} IS NULL
        )`,
    ),
    index("idx_dependency_action_rule_id").on(table.ruleId),
    index("idx_dependency_action_target").on(
      table.configurationId,
      table.targetId,
      table.targetType,
    ),
    index("idx_dependency_action_price_rule_id").on(table.priceRuleId),
  ],
);

export type Component = typeof component.$inferSelect;
export type NewComponent = typeof component.$inferInsert;
export type ComponentConfiguration = typeof componentConfiguration.$inferSelect;
export type NewComponentConfiguration = typeof componentConfiguration.$inferInsert;
export type ComponentTarget = typeof componentTarget.$inferSelect;
export type NewComponentTarget = typeof componentTarget.$inferInsert;
export type ComponentConfigurationTarget = typeof componentConfigurationTarget.$inferSelect;
export type NewComponentConfigurationTarget = typeof componentConfigurationTarget.$inferInsert;
export type ComponentConfigurationVariant = typeof componentConfigurationVariant.$inferSelect;
export type NewComponentConfigurationVariant = typeof componentConfigurationVariant.$inferInsert;
export type ComponentPriceRule = typeof componentPriceRule.$inferSelect;
export type NewComponentPriceRule = typeof componentPriceRule.$inferInsert;
export type ComponentPriceRuleAmount = typeof componentPriceRuleAmount.$inferSelect;
export type NewComponentPriceRuleAmount = typeof componentPriceRuleAmount.$inferInsert;
export type ComponentPriceRulePercent = typeof componentPriceRulePercent.$inferSelect;
export type NewComponentPriceRulePercent = typeof componentPriceRulePercent.$inferInsert;
export type ComponentPricingTemplate = typeof componentPricingTemplate.$inferSelect;
export type NewComponentPricingTemplate = typeof componentPricingTemplate.$inferInsert;
export type ComponentGroup = typeof componentGroup.$inferSelect;
export type NewComponentGroup = typeof componentGroup.$inferInsert;
export type ComponentGroupTranslation = typeof componentGroupTranslation.$inferSelect;
export type NewComponentGroupTranslation = typeof componentGroupTranslation.$inferInsert;
export type ComponentItem = typeof componentItem.$inferSelect;
export type NewComponentItem = typeof componentItem.$inferInsert;
export type ComponentItemOptionSelection = typeof componentItemOptionSelection.$inferSelect;
export type NewComponentItemOptionSelection = typeof componentItemOptionSelection.$inferInsert;
export type ComponentItemOptionValueSelection =
  typeof componentItemOptionValueSelection.$inferSelect;
export type NewComponentItemOptionValueSelection =
  typeof componentItemOptionValueSelection.$inferInsert;
export type ComponentItemTranslation = typeof componentItemTranslation.$inferSelect;
export type NewComponentItemTranslation = typeof componentItemTranslation.$inferInsert;
export type DependencyRule = typeof dependencyRule.$inferSelect;
export type NewDependencyRule = typeof dependencyRule.$inferInsert;
export type ConditionGroup = typeof conditionGroup.$inferSelect;
export type NewConditionGroup = typeof conditionGroup.$inferInsert;
export type Condition = typeof condition.$inferSelect;
export type NewCondition = typeof condition.$inferInsert;
export type DependencyAction = typeof dependencyAction.$inferSelect;
export type NewDependencyAction = typeof dependencyAction.$inferInsert;
