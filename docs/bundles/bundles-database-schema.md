# Bundles Database Schema

Bundle — это продукт. Все таблицы ссылаются напрямую на `inventory.product.id`.

## ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUNDLES SCHEMA                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              inventory.product
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│   bundle_group   │       │ pricing_template │       │  dependency_rule   │
├──────────────────┤       ├──────────────────┤       ├────────────────────┤
│ id (PK)          │──1:N──│ id (PK)          │       │ id (PK)            │
│ product_id (FK)  │       │ product_id (FK)  │       │ product_id (FK)    │
│ title            │       │ name             │       │ name               │
│ sort_index       │       │ price_type       │       │ enabled            │
│ min_selection    │       │ price_value      │       │ priority           │
│ max_selection    │       └──────────────────┘       │ logic_operator     │
└──────────────────┘                                  └────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│   bundle_item    │
├──────────────────┤
│ id (PK)          │
│ group_id (FK)    │
│ item_type        │
│ sort_index       │
│ ref_product_id   │
│ ref_variant_id   │
│ title            │
│ featured_img_id  │
│ min_qty          │
│ max_qty          │
│ default_qty      │
│ price_type       │
│ price_value      │
│ pricing_tmpl_id  │
│ visible          │
│ selected         │
│ excluded_variants│
└──────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY RULES                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
│  dependency_rule   │       │  condition_group   │       │    condition       │
├────────────────────┤       ├────────────────────┤       ├────────────────────┤
│ id (PK)            │──1:N──│ id (PK)            │──1:N──│ id (PK)            │
│ product_id (FK)    │       │ rule_id (FK)       │       │ group_id (FK)      │
│ name               │       │ logic_operator     │       │ category           │
│ enabled            │       │ sort_index         │       │ subject            │
│ priority           │       └────────────────────┘       │ operator           │
│ logic_operator     │                                    │ target_type        │
│ created_at         │                                    │ target_id          │
│ updated_at         │                                    │ value              │
└────────────────────┘                                    └────────────────────┘
        │
        │        ┌────────────────────┐
        └──1:N───│  dependency_action │
                 ├────────────────────┤
                 │ id (PK)            │
                 │ rule_id (FK)       │
                 │ action_type        │
                 │ target_type        │
                 │ target_id          │
                 │ required_value     │
                 │ price_type         │
                 │ price_value        │
                 │ stackable          │
                 │ sort_index         │
                 └────────────────────┘
```

---

## Enums

### BundleItemType
```typescript
enum BundleItemType {
  PRODUCT = "PRODUCT",   // Simple product without variants
  VARIANT = "VARIANT",   // Specific variant of a product
}
```

### BundlePriceType
```typescript
enum BundlePriceType {
  BASE = "BASE",                     // No changes, use base product price
  FIXED = "FIXED",                   // Override with fixed price
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT", // Subtract percentage from base
  DISCOUNT_FIXED = "DISCOUNT_FIXED", // Subtract fixed amount from base
  FREE = "FREE",                     // 100% discount, free in bundle
}
```

### DisplayStyle
```typescript
type DisplayStyle = "accordion" | "tabs" | "flat" | "wizard";
```

### OutOfStockBehavior
```typescript
type OutOfStockBehavior = "hide" | "disable" | "backorder";
```

### LogicOperator
```typescript
enum LogicOperator {
  AND = "AND",
  OR = "OR",
}
```

### ConditionCategory
```typescript
enum ConditionCategory {
  STATE_CHECK = "STATE_CHECK",
  NUMERIC = "NUMERIC",
}
```

### ConditionSubject
```typescript
enum ConditionSubject {
  ITEM_SELECTED = "ITEM_SELECTED",
  ITEM_QTY = "ITEM_QTY",
  GROUP_TOTAL_QTY = "GROUP_TOTAL_QTY",
}
```

### Operators
```typescript
// For STATE_CHECK conditions
enum StateCheckOperator {
  IS_SELECTED = "IS_SELECTED",
  IS_NOT_SELECTED = "IS_NOT_SELECTED",
}

// For NUMERIC conditions
enum ComparisonOperator {
  GTE = "GTE",
  EQ = "EQ",
  LTE = "LTE",
}
```

### DependencyTargetType
```typescript
enum DependencyTargetType {
  ITEM = "ITEM",
  GROUP = "GROUP",
  BUNDLE = "BUNDLE",
}
```

### DependencyActionType
```typescript
enum DependencyActionType {
  SHOW = "SHOW",
  HIDE = "HIDE",
  SET_REQUIRED = "SET_REQUIRED",
  ADJUST_PRICE = "ADJUST_PRICE",
}
```

---

## Drizzle Schema

```typescript
// services/catalog/src/repositories/models/schema.ts
import { pgSchema } from "drizzle-orm/pg-core";
export const catalogSchema = pgSchema("catalog");
```

### Bundle Pricing Template

```typescript
// services/catalog/src/repositories/models/bundle.ts
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

export const bundlePricingTemplate = catalogSchema.table(
  "bundle_pricing_template",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // FK to inventory.product
    name: varchar("name", { length: 255 }).notNull(),
    priceType: varchar("price_type", { length: 32 }).notNull(), // BundlePriceType
    priceValue: integer("price_value"), // cents, nullable for BASE/FREE
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_bundle_pricing_template_product_id").on(table.productId),
  ]
);
```

### Bundle Group

```typescript
export const bundleGroup = catalogSchema.table(
  "bundle_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // FK to inventory.product
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
  ]
);
```

### Bundle Item

```typescript
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
    refProductId: uuid("ref_product_id"),  // FK to inventory.product
    refVariantId: uuid("ref_variant_id"),  // FK to inventory.variant

    // Customization
    title: varchar("title", { length: 255 }), // overrides product title
    featuredImageId: uuid("featured_image_id"), // FK to media

    // For PRODUCT type: excluded variant IDs
    excludedVariantIds: jsonb("excluded_variant_ids").$type<string[]>(),

    // Quantity constraints
    minQty: integer("min_qty").default(1),
    maxQty: integer("max_qty"), // null = no limit
    defaultQty: integer("default_qty").default(1), // initial quantity when added to cart

    // Pricing (inline or template reference)
    priceType: varchar("price_type", { length: 32 }), // BundlePriceType
    priceValue: integer("price_value"), // cents
    pricingTemplateId: uuid("pricing_template_id")
      .references(() => bundlePricingTemplate.id, { onDelete: "set null" }),

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
  ]
);
```

### Dependency Rule

```typescript
export const dependencyRule = catalogSchema.table(
  "dependency_rule",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(), // FK to inventory.product
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
  ]
);
```

### Condition Group

```typescript
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
```

### Condition

```typescript
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
  ]
);
```

### Dependency Action

```typescript
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
  ]
);
```

---

## Type Exports

```typescript
export type BundleGroup = typeof bundleGroup.$inferSelect;
export type NewBundleGroup = typeof bundleGroup.$inferInsert;
export type BundleItem = typeof bundleItem.$inferSelect;
export type NewBundleItem = typeof bundleItem.$inferInsert;
export type BundlePricingTemplate = typeof bundlePricingTemplate.$inferSelect;
export type NewBundlePricingTemplate = typeof bundlePricingTemplate.$inferInsert;
export type DependencyRule = typeof dependencyRule.$inferSelect;
export type NewDependencyRule = typeof dependencyRule.$inferInsert;
export type ConditionGroup = typeof conditionGroup.$inferSelect;
export type NewConditionGroup = typeof conditionGroup.$inferInsert;
export type Condition = typeof condition.$inferSelect;
export type NewCondition = typeof condition.$inferInsert;
export type DependencyAction = typeof dependencyAction.$inferSelect;
export type NewDependencyAction = typeof dependencyAction.$inferInsert;
```

---

## Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Bundle = Product** | Direct FK to `inventory.product` | No separate bundle entity, product IS bundle |
| **Cross-schema FK** | `product_id` → `inventory.product.id` | Logical FK, cascade handled at app level |
| **Pricing** | Inline + Template | `price_type/value` for custom, `pricing_template_id` for reuse |
| **Excluded Variants** | JSONB array | Avoids join table for rarely-used feature |
| **Condition Groups** | Separate table | Supports nested AND/OR logic |
| **project_id** | On all tables | Data-level multi-tenancy |
| **Money values** | Integer (cents) | Avoids floating point precision issues |
| **ref_product_id** | Prefixed with `ref_` | Distinguishes referenced product from bundle product |
| **Action stacking** | `stackable` boolean on action | Controls if effects accumulate (true) or replace (false, higher priority wins) |

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| `bundle_group` | `idx_bundle_group_product_id` | Load groups by product |
| `bundle_group` | `idx_bundle_group_sort` | Ordered retrieval |
| `bundle_pricing_template` | `idx_..._product_id` | Load templates by product |
| `bundle_item` | `idx_bundle_item_group_id` | Load items by group |
| `bundle_item` | `idx_bundle_item_sort` | Ordered retrieval |
| `dependency_rule` | `idx_dependency_rule_product_id` | Load rules by product |
| `dependency_rule` | `idx_dependency_rule_priority` | Priority-based evaluation |
| `condition` | `idx_condition_target` | Find conditions affecting target |
| `dependency_action` | `idx_dependency_action_target` | Find actions affecting target |

---

## Example Queries

### Load bundle groups with items
```typescript
const groups = await db.query.bundleGroup.findMany({
  where: eq(bundleGroup.productId, productId),
  orderBy: [asc(bundleGroup.sortIndex)],
  with: {
    items: {
      orderBy: [asc(bundleItem.sortIndex)],
    },
  },
});
```

### Load dependency rules for product
```typescript
const rules = await db.query.dependencyRule.findMany({
  where: and(
    eq(dependencyRule.productId, productId),
    eq(dependencyRule.enabled, true)
  ),
  orderBy: [desc(dependencyRule.priority)],
  with: {
    conditionGroups: {
      with: { conditions: true },
    },
    actions: true,
  },
});
```

### Find items affected by a rule action
```typescript
const affectedItems = await db
  .select()
  .from(bundleItem)
  .innerJoin(
    dependencyAction,
    and(
      eq(dependencyAction.targetType, "ITEM"),
      eq(dependencyAction.targetId, bundleItem.id)
    )
  )
  .where(eq(dependencyAction.ruleId, ruleId));
```
