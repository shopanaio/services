import {
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

// ==============================
// Bundle Pricing Template
// ==============================

export const bundlePricingTemplate = catalogSchema.table(
  "bundle_pricing_template",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // FK to inventory.product (logical)
    name: varchar("name", { length: 255 }).notNull(),
    priceType: varchar("price_type", { length: 32 }).notNull(), // BundlePriceType
    priceValue: integer("price_value"), // cents, nullable for BASE/FREE
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_bundle_pricing_template_product_id").on(table.productId),
    index("idx_bundle_pricing_template_project_id").on(table.projectId),
  ]
);

// ==============================
// Bundle Group
// ==============================

export const bundleGroup = catalogSchema.table(
  "bundle_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // FK to inventory.product (logical)
    title: varchar("title", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    minSelection: integer("min_selection"), // null = no minimum
    maxSelection: integer("max_selection"), // null = no maximum
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_group_product_id").on(table.productId),
    index("idx_bundle_group_sort").on(table.productId, table.sortIndex),
    index("idx_bundle_group_project_id").on(table.projectId),
  ]
);

// ==============================
// Bundle Item
// ==============================

export const bundleItem = catalogSchema.table(
  "bundle_item",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => bundleGroup.id, { onDelete: "cascade" }),

    // Item type
    itemType: varchar("item_type", { length: 32 }).notNull(), // PRODUCT | VARIANT
    sortIndex: integer("sort_index").notNull().default(0),

    // References to inventory (one of these based on itemType)
    refProductId: uuid("ref_product_id"), // FK to inventory.product (logical)
    refVariantId: uuid("ref_variant_id"), // FK to inventory.variant (logical)

    // Customization
    title: varchar("title", { length: 255 }), // overrides product title
    featuredImageId: uuid("featured_image_id"), // FK to media (logical)

    // For PRODUCT type: excluded variant IDs
    excludedVariantIds: jsonb("excluded_variant_ids").$type<string[]>(),

    // Quantity constraints
    minQty: integer("min_qty").default(1),
    maxQty: integer("max_qty"), // null = no limit
    defaultQty: integer("default_qty").default(1), // initial quantity when added to cart

    // Pricing (inline or template reference)
    priceType: varchar("price_type", { length: 32 }), // BundlePriceType
    priceValue: integer("price_value"), // cents
    pricingTemplateId: uuid("pricing_template_id").references(
      () => bundlePricingTemplate.id,
      { onDelete: "set null" }
    ),

    // Visibility & defaults
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
    index("idx_bundle_item_project_id").on(table.projectId),
  ]
);

// ==============================
// Dependency Rule
// ==============================

export const dependencyRule = catalogSchema.table(
  "dependency_rule",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // FK to inventory.product (logical)
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
    index("idx_dependency_rule_product_id").on(table.productId),
    index("idx_dependency_rule_priority").on(table.productId, table.priority),
    index("idx_dependency_rule_project_id").on(table.projectId),
  ]
);

// ==============================
// Condition Group
// ==============================

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
    index("idx_condition_group_project_id").on(table.projectId),
  ]
);

// ==============================
// Condition
// ==============================

export const condition = catalogSchema.table(
  "condition",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => conditionGroup.id, { onDelete: "cascade" }),

    // Discriminator
    category: varchar("category", { length: 32 }).notNull(), // STATE_CHECK | NUMERIC

    // What we're checking
    subject: varchar("subject", { length: 32 }).notNull(), // ITEM_SELECTED | ITEM_QTY | GROUP_TOTAL_QTY

    // Operator (depends on category)
    operator: varchar("operator", { length: 32 }).notNull(),
    // STATE_CHECK: IS_SELECTED | IS_NOT_SELECTED
    // NUMERIC: GTE | EQ | LTE

    // Target
    targetType: varchar("target_type", { length: 32 }).notNull(), // ITEM | GROUP | BUNDLE
    targetId: uuid("target_id").notNull(), // FK to bundle_item or bundle_group

    // Value (for NUMERIC conditions)
    value: integer("value"),

    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_condition_group_id").on(table.groupId),
    index("idx_condition_target").on(table.targetType, table.targetId),
    index("idx_condition_project_id").on(table.projectId),
  ]
);

// ==============================
// Dependency Action
// ==============================

export const dependencyAction = catalogSchema.table(
  "dependency_action",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => dependencyRule.id, { onDelete: "cascade" }),

    // Action type
    actionType: varchar("action_type", { length: 32 }).notNull(),
    // SHOW | HIDE | SET_REQUIRED | ADJUST_PRICE

    // Target
    targetType: varchar("target_type", { length: 32 }).notNull(), // ITEM | GROUP | BUNDLE
    targetId: uuid("target_id"), // FK, nullable for BUNDLE target

    // Action-specific fields
    requiredValue: boolean("required_value"), // for SET_REQUIRED
    priceType: varchar("price_type", { length: 32 }), // for ADJUST_PRICE
    priceValue: integer("price_value"), // for ADJUST_PRICE

    // Stacking behavior
    stackable: boolean("stackable").notNull().default(false),
    // true  = stacks with other actions on same target
    // false = replaces previous (higher priority wins)

    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_dependency_action_rule_id").on(table.ruleId),
    index("idx_dependency_action_target").on(table.targetType, table.targetId),
    index("idx_dependency_action_project_id").on(table.projectId),
  ]
);

// ==============================
// Type Exports
// ==============================

export type BundlePricingTemplate = typeof bundlePricingTemplate.$inferSelect;
export type NewBundlePricingTemplate = typeof bundlePricingTemplate.$inferInsert;
export type BundleGroup = typeof bundleGroup.$inferSelect;
export type NewBundleGroup = typeof bundleGroup.$inferInsert;
export type BundleItem = typeof bundleItem.$inferSelect;
export type NewBundleItem = typeof bundleItem.$inferInsert;
export type DependencyRule = typeof dependencyRule.$inferSelect;
export type NewDependencyRule = typeof dependencyRule.$inferInsert;
export type ConditionGroup = typeof conditionGroup.$inferSelect;
export type NewConditionGroup = typeof conditionGroup.$inferInsert;
export type Condition = typeof condition.$inferSelect;
export type NewCondition = typeof condition.$inferInsert;
export type DependencyAction = typeof dependencyAction.$inferSelect;
export type NewDependencyAction = typeof dependencyAction.$inferInsert;
