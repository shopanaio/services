# Bundles Implementation Plan

## Overview

This plan implements the Bundles functionality in the catalog service, allowing products to be configured as bundles with groups, items, pricing templates, and dependency rules.

**Service:** catalog
**Pattern:** Script
**Authorization:** `@Policy("bundle", "manage")` via IAM service

---

## Design Decisions

### Ordering Strategy: `sortIndex` vs `lexoRank`

This plan uses **`sortIndex`** (integer-based ordering) instead of `lexoRank` for the following reasons:

1. **Batch reordering** - Bundle groups and items are typically reordered via drag-and-drop, which sends the complete new order. This makes `sortIndex` efficient (single UPDATE with CASE statement).
2. **Simplicity** - Integer ordering is easier to debug and reason about.
3. **Infrequent reordering** - Unlike collection items which may be frequently reordered, bundle structure is typically set once and rarely changed.

If frequent arbitrary insertions become a requirement, consider migrating to `lexoRank`.

### Authorization Strategy

Authorization is handled at the **Script level** using the `@Policy` decorator from `@shopana/shared-kernel`. The pattern:

1. Scripts extend `BaseScript` which implements `Authorizable` interface
2. `BaseScript` has an `authProvider` that delegates to IAM service via broker
3. `@Policy` decorator wraps the `execute` method to check permissions before running

Example:
```typescript
@Policy({ resource: "bundle", action: "manage" })
async execute(params: BundleGroupCreateParams): Promise<BundleGroupResult> {
  // Implementation
}
```

---

## Phase 1: Database Schema

### 1.1 Create Drizzle Model File

**File:** `/services/catalog/src/repositories/models/bundle.ts`

Define all bundle-related tables using Drizzle ORM following the pattern from `collection.ts`:

```typescript
// Tables to create:
// 1. bundlePricingTemplate
// 2. bundleGroup
// 3. bundleItem
// 4. dependencyRule
// 5. conditionGroup
// 6. condition
// 7. dependencyAction
```

**Schema Details:**

1. **bundlePricingTemplate**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `productId: uuid("product_id").notNull()` - FK to inventory.product (logical, not enforced)
   - `name: varchar("name", { length: 255 }).notNull()`
   - `priceType: varchar("price_type", { length: 32 }).notNull()` - BundlePriceType enum
   - `priceValue: integer("price_value")` - cents, nullable for BASE/FREE
   - `sortIndex: integer("sort_index").notNull().default(0)`
   - Index: `idx_bundle_pricing_template_product_id` on `productId`

2. **bundleGroup**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `productId: uuid("product_id").notNull()`
   - `title: varchar("title", { length: 255 }).notNull()`
   - `sortIndex: integer("sort_index").notNull().default(0)`
   - `minSelection: integer("min_selection")` - null = no minimum
   - `maxSelection: integer("max_selection")` - null = no maximum
   - `createdAt, updatedAt` timestamps
   - Indexes: `idx_bundle_group_product_id`, `idx_bundle_group_sort`

3. **bundleItem**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `groupId: uuid("group_id").notNull().references(() => bundleGroup.id, { onDelete: "cascade" })`
   - `itemType: varchar("item_type", { length: 32 }).notNull()` - PRODUCT | VARIANT
   - `sortIndex: integer("sort_index").notNull().default(0)`
   - `refProductId: uuid("ref_product_id")` - FK to inventory.product
   - `refVariantId: uuid("ref_variant_id")` - FK to inventory.variant
   - `title: varchar("title", { length: 255 })` - overrides product title
   - `featuredImageId: uuid("featured_image_id")` - FK to media
   - `excludedVariantIds: jsonb("excluded_variant_ids").$type<string[]>()`
   - `minQty: integer("min_qty").default(1)`
   - `maxQty: integer("max_qty")` - null = no limit
   - `defaultQty: integer("default_qty").default(1)`
   - `priceType: varchar("price_type", { length: 32 })`
   - `priceValue: integer("price_value")`
   - `pricingTemplateId: uuid("pricing_template_id").references(() => bundlePricingTemplate.id, { onDelete: "set null" })`
   - `visible: boolean("visible").notNull().default(true)`
   - `selected: boolean("selected").notNull().default(false)`
   - `createdAt, updatedAt` timestamps
   - Indexes: `idx_bundle_item_group_id`, `idx_bundle_item_ref_product_id`, `idx_bundle_item_ref_variant_id`, `idx_bundle_item_sort`

4. **dependencyRule**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `productId: uuid("product_id").notNull()`
   - `name: varchar("name", { length: 255 }).notNull()`
   - `enabled: boolean("enabled").notNull().default(true)`
   - `priority: integer("priority").notNull().default(0)`
   - `logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND")`
   - `createdAt, updatedAt` timestamps
   - Indexes: `idx_dependency_rule_product_id`, `idx_dependency_rule_priority`

5. **conditionGroup**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `ruleId: uuid("rule_id").notNull().references(() => dependencyRule.id, { onDelete: "cascade" })`
   - `logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND")`
   - `sortIndex: integer("sort_index").notNull().default(0)`
   - Index: `idx_condition_group_rule_id`

6. **condition**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `groupId: uuid("group_id").notNull().references(() => conditionGroup.id, { onDelete: "cascade" })`
   - `category: varchar("category", { length: 32 }).notNull()` - STATE_CHECK | NUMERIC
   - `subject: varchar("subject", { length: 32 }).notNull()` - ITEM_SELECTED | ITEM_QTY | GROUP_TOTAL_QTY
   - `operator: varchar("operator", { length: 32 }).notNull()`
   - `targetType: varchar("target_type", { length: 32 }).notNull()` - ITEM | GROUP | BUNDLE
   - `targetId: uuid("target_id").notNull()`
   - `value: integer("value")`
   - `sortIndex: integer("sort_index").notNull().default(0)`
   - Indexes: `idx_condition_group_id`, `idx_condition_target`

7. **dependencyAction**
   - `id: uuid("id").primaryKey()`
   - `projectId: uuid("project_id").notNull()`
   - `ruleId: uuid("rule_id").notNull().references(() => dependencyRule.id, { onDelete: "cascade" })`
   - `actionType: varchar("action_type", { length: 32 }).notNull()` - SHOW | HIDE | SET_REQUIRED | ADJUST_PRICE
   - `targetType: varchar("target_type", { length: 32 }).notNull()`
   - `targetId: uuid("target_id")` - nullable for BUNDLE target
   - `requiredValue: boolean("required_value")`
   - `priceType: varchar("price_type", { length: 32 })`
   - `priceValue: integer("price_value")`
   - `stackable: boolean("stackable").notNull().default(false)`
   - `sortIndex: integer("sort_index").notNull().default(0)`
   - Indexes: `idx_dependency_action_rule_id`, `idx_dependency_action_target`

### 1.2 Export Types

At the end of `bundle.ts`, export inferred types:

```typescript
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
```

### 1.3 Update Models Index

**File:** `/services/catalog/src/repositories/models/index.ts`

Add export:
```typescript
// Bundles
export * from "./bundle";
```

### 1.4 Generate Migration

Run `pnpm db:generate` in catalog service to create migration file.

---

## Phase 2: Repositories

### 2.1 BundleGroupRepository

**File:** `/services/catalog/src/repositories/bundle/BundleGroupRepository.ts`

Following `CollectionRepository.ts` pattern:

```typescript
export class BundleGroupRepository extends BaseRepository {
  // Find methods
  async findById(id: string): Promise<BundleGroup | null>
  async findByProductId(productId: string): Promise<BundleGroup[]>
  async getByIds(ids: readonly string[]): Promise<BundleGroup[]>

  // CRUD
  async create(data: { productId: string; title: string; sortIndex?: number; minSelection?: number; maxSelection?: number }): Promise<BundleGroup>
  async update(id: string, data: Partial<{ title: string; sortIndex: number; minSelection: number | null; maxSelection: number | null }>): Promise<BundleGroup | null>
  async delete(id: string): Promise<boolean>

  // Reorder
  async getMaxSortIndex(productId: string): Promise<number>
  async updateSortIndex(id: string, sortIndex: number): Promise<void>
  async batchUpdateSortIndex(updates: Array<{ id: string; sortIndex: number }>): Promise<void>
}
```

### 2.2 BundleItemRepository

**File:** `/services/catalog/src/repositories/bundle/BundleItemRepository.ts`

```typescript
export class BundleItemRepository extends BaseRepository {
  // Find methods
  async findById(id: string): Promise<BundleItem | null>
  async findByGroupId(groupId: string): Promise<BundleItem[]>
  async findByGroupIds(groupIds: readonly string[]): Promise<BundleItem[]>
  async getByIds(ids: readonly string[]): Promise<BundleItem[]>

  // CRUD
  async create(data: NewBundleItem): Promise<BundleItem>
  async update(id: string, data: Partial<BundleItem>): Promise<BundleItem | null>
  async delete(id: string): Promise<boolean>

  // Reorder
  async getMaxSortIndex(groupId: string): Promise<number>
  async updateSortIndex(id: string, sortIndex: number): Promise<void>
  async batchUpdateSortIndex(updates: Array<{ id: string; sortIndex: number }>): Promise<void>
}
```

### 2.3 BundlePricingTemplateRepository

**File:** `/services/catalog/src/repositories/bundle/BundlePricingTemplateRepository.ts`

```typescript
export class BundlePricingTemplateRepository extends BaseRepository {
  async findById(id: string): Promise<BundlePricingTemplate | null>
  async findByProductId(productId: string): Promise<BundlePricingTemplate[]>
  async getByIds(ids: readonly string[]): Promise<BundlePricingTemplate[]>

  async create(data: { productId: string; name: string; priceType: string; priceValue?: number; sortIndex?: number }): Promise<BundlePricingTemplate>
  async update(id: string, data: Partial<{ name: string; priceType: string; priceValue: number | null; sortIndex: number }>): Promise<BundlePricingTemplate | null>
  async delete(id: string): Promise<boolean>
}
```

### 2.4 DependencyRuleRepository

**File:** `/services/catalog/src/repositories/bundle/DependencyRuleRepository.ts`

```typescript
export class DependencyRuleRepository extends BaseRepository {
  async findById(id: string): Promise<DependencyRule | null>
  async findByProductId(productId: string): Promise<DependencyRule[]>
  async getByIds(ids: readonly string[]): Promise<DependencyRule[]>

  async create(data: { productId: string; name: string; enabled?: boolean; priority?: number; logicOperator?: string }): Promise<DependencyRule>
  async update(id: string, data: Partial<{ name: string; enabled: boolean; priority: number; logicOperator: string }>): Promise<DependencyRule | null>
  async delete(id: string): Promise<boolean>
}
```

### 2.5 ConditionGroupRepository

**File:** `/services/catalog/src/repositories/bundle/ConditionGroupRepository.ts`

```typescript
export class ConditionGroupRepository extends BaseRepository {
  async findById(id: string): Promise<ConditionGroup | null>
  async findByRuleId(ruleId: string): Promise<ConditionGroup[]>
  async findByRuleIds(ruleIds: readonly string[]): Promise<ConditionGroup[]>

  async create(data: { ruleId: string; logicOperator?: string; sortIndex?: number }): Promise<ConditionGroup>
  async update(id: string, data: Partial<{ logicOperator: string; sortIndex: number }>): Promise<ConditionGroup | null>
  async delete(id: string): Promise<boolean>
  async deleteByRuleId(ruleId: string): Promise<void>
}
```

### 2.6 ConditionRepository

**File:** `/services/catalog/src/repositories/bundle/ConditionRepository.ts`

```typescript
export class ConditionRepository extends BaseRepository {
  async findById(id: string): Promise<Condition | null>
  async findByGroupId(groupId: string): Promise<Condition[]>
  async findByGroupIds(groupIds: readonly string[]): Promise<Condition[]>

  async create(data: NewCondition): Promise<Condition>
  async update(id: string, data: Partial<Condition>): Promise<Condition | null>
  async delete(id: string): Promise<boolean>
  async deleteByGroupId(groupId: string): Promise<void>
}
```

### 2.7 DependencyActionRepository

**File:** `/services/catalog/src/repositories/bundle/DependencyActionRepository.ts`

```typescript
export class DependencyActionRepository extends BaseRepository {
  async findById(id: string): Promise<DependencyAction | null>
  async findByRuleId(ruleId: string): Promise<DependencyAction[]>
  async findByRuleIds(ruleIds: readonly string[]): Promise<DependencyAction[]>

  async create(data: NewDependencyAction): Promise<DependencyAction>
  async update(id: string, data: Partial<DependencyAction>): Promise<DependencyAction | null>
  async delete(id: string): Promise<boolean>
  async deleteByRuleId(ruleId: string): Promise<void>
}
```

### 2.8 Repository Index

**File:** `/services/catalog/src/repositories/bundle/index.ts`

```typescript
export * from "./BundleGroupRepository.js";
export * from "./BundleItemRepository.js";
export * from "./BundlePricingTemplateRepository.js";
export * from "./DependencyRuleRepository.js";
export * from "./ConditionGroupRepository.js";
export * from "./ConditionRepository.js";
export * from "./DependencyActionRepository.js";
```

### 2.9 Update Repository Aggregator

**File:** `/services/catalog/src/repositories/Repository.ts`

Add to imports and constructor:
```typescript
import {
  BundleGroupRepository,
  BundleItemRepository,
  BundlePricingTemplateRepository,
  DependencyRuleRepository,
  ConditionGroupRepository,
  ConditionRepository,
  DependencyActionRepository,
} from "./bundle/index.js";

// In class:
public readonly bundleGroup: BundleGroupRepository;
public readonly bundleItem: BundleItemRepository;
public readonly bundlePricingTemplate: BundlePricingTemplateRepository;
public readonly dependencyRule: DependencyRuleRepository;
public readonly conditionGroup: ConditionGroupRepository;
public readonly condition: ConditionRepository;
public readonly dependencyAction: DependencyActionRepository;

// In constructor:
this.bundleGroup = new BundleGroupRepository(db, projectId);
this.bundleItem = new BundleItemRepository(db, projectId);
this.bundlePricingTemplate = new BundlePricingTemplateRepository(db, projectId);
this.dependencyRule = new DependencyRuleRepository(db, projectId);
this.conditionGroup = new ConditionGroupRepository(db, projectId);
this.condition = new ConditionRepository(db, projectId);
this.dependencyAction = new DependencyActionRepository(db, projectId);
```

---

## Phase 3: DataLoaders

### 3.1 BundleLoader

**File:** `/services/catalog/src/loaders/BundleLoader.ts`

Following `CollectionLoader.ts` pattern with batch-loading for nested data:

```typescript
import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import type {
  BundleGroup,
  BundleItem,
  BundlePricingTemplate,
  DependencyRule,
  ConditionGroup,
  Condition,
  DependencyAction,
} from "../repositories/models/index.js";

export class BundleLoader {
  // Single entity loaders
  public readonly bundleGroup: DataLoader<string, BundleGroup | null>;
  public readonly bundleItem: DataLoader<string, BundleItem | null>;
  public readonly bundlePricingTemplate: DataLoader<string, BundlePricingTemplate | null>;
  public readonly dependencyRule: DataLoader<string, DependencyRule | null>;

  // Batch loaders for nested data (critical for N+1 prevention)
  public readonly bundleGroupsByProductId: DataLoader<string, BundleGroup[]>;
  public readonly bundleItemsByGroupId: DataLoader<string, BundleItem[]>;
  public readonly bundlePricingTemplatesByProductId: DataLoader<string, BundlePricingTemplate[]>;
  public readonly dependencyRulesByProductId: DataLoader<string, DependencyRule[]>;
  public readonly conditionGroupsByRuleId: DataLoader<string, ConditionGroup[]>;
  public readonly conditionsByGroupId: DataLoader<string, Condition[]>;
  public readonly dependencyActionsByRuleId: DataLoader<string, DependencyAction[]>;

  constructor(repository: Repository) {
    // Single entity loaders
    this.bundleGroup = new DataLoader(async (ids) => {
      const groups = await repository.bundleGroup.getByIds(ids);
      const map = new Map(groups.map(g => [g.id, g]));
      return ids.map(id => map.get(id) ?? null);
    });

    this.bundleItem = new DataLoader(async (ids) => {
      const items = await repository.bundleItem.getByIds(ids);
      const map = new Map(items.map(i => [i.id, i]));
      return ids.map(id => map.get(id) ?? null);
    });

    this.bundlePricingTemplate = new DataLoader(async (ids) => {
      const templates = await repository.bundlePricingTemplate.getByIds(ids);
      const map = new Map(templates.map(t => [t.id, t]));
      return ids.map(id => map.get(id) ?? null);
    });

    this.dependencyRule = new DataLoader(async (ids) => {
      const rules = await repository.dependencyRule.getByIds(ids);
      const map = new Map(rules.map(r => [r.id, r]));
      return ids.map(id => map.get(id) ?? null);
    });

    // Batch loaders for nested data
    this.bundleGroupsByProductId = new DataLoader(async (productIds) => {
      const groups = await repository.bundleGroup.findByProductIds(productIds as string[]);
      const map = new Map<string, BundleGroup[]>();
      for (const group of groups) {
        const list = map.get(group.productId) ?? [];
        list.push(group);
        map.set(group.productId, list);
      }
      return productIds.map(id => map.get(id) ?? []);
    });

    this.bundleItemsByGroupId = new DataLoader(async (groupIds) => {
      const items = await repository.bundleItem.findByGroupIds(groupIds);
      const map = new Map<string, BundleItem[]>();
      for (const item of items) {
        const list = map.get(item.groupId) ?? [];
        list.push(item);
        map.set(item.groupId, list);
      }
      return groupIds.map(id => map.get(id) ?? []);
    });

    this.bundlePricingTemplatesByProductId = new DataLoader(async (productIds) => {
      const templates = await repository.bundlePricingTemplate.findByProductIds(productIds as string[]);
      const map = new Map<string, BundlePricingTemplate[]>();
      for (const template of templates) {
        const list = map.get(template.productId) ?? [];
        list.push(template);
        map.set(template.productId, list);
      }
      return productIds.map(id => map.get(id) ?? []);
    });

    this.dependencyRulesByProductId = new DataLoader(async (productIds) => {
      const rules = await repository.dependencyRule.findByProductIds(productIds as string[]);
      const map = new Map<string, DependencyRule[]>();
      for (const rule of rules) {
        const list = map.get(rule.productId) ?? [];
        list.push(rule);
        map.set(rule.productId, list);
      }
      return productIds.map(id => map.get(id) ?? []);
    });

    this.conditionGroupsByRuleId = new DataLoader(async (ruleIds) => {
      const groups = await repository.conditionGroup.findByRuleIds(ruleIds);
      const map = new Map<string, ConditionGroup[]>();
      for (const group of groups) {
        const list = map.get(group.ruleId) ?? [];
        list.push(group);
        map.set(group.ruleId, list);
      }
      return ruleIds.map(id => map.get(id) ?? []);
    });

    this.conditionsByGroupId = new DataLoader(async (groupIds) => {
      const conditions = await repository.condition.findByGroupIds(groupIds);
      const map = new Map<string, Condition[]>();
      for (const condition of conditions) {
        const list = map.get(condition.groupId) ?? [];
        list.push(condition);
        map.set(condition.groupId, list);
      }
      return groupIds.map(id => map.get(id) ?? []);
    });

    this.dependencyActionsByRuleId = new DataLoader(async (ruleIds) => {
      const actions = await repository.dependencyAction.findByRuleIds(ruleIds);
      const map = new Map<string, DependencyAction[]>();
      for (const action of actions) {
        const list = map.get(action.ruleId) ?? [];
        list.push(action);
        map.set(action.ruleId, list);
      }
      return ruleIds.map(id => map.get(id) ?? []);
    });
  }
}
```

### 3.2 Update Loader Aggregator

**File:** `/services/catalog/src/loaders/Loader.ts`

Add BundleLoader:
```typescript
import { BundleLoader } from "./BundleLoader.js";

// In class:
public readonly bundle: BundleLoader;

// In constructor:
this.bundle = new BundleLoader(repository);
```

---

## Phase 4: GraphQL Schema

### 4.1 Bundle GraphQL Types

**File:** `/services/catalog/src/api/graphql-admin/schema/bundle.graphql`

```graphql
# ==============================
# Enums
# ==============================

enum BundleItemType {
  PRODUCT
  VARIANT
}

enum BundlePriceType {
  BASE
  FIXED
  DISCOUNT_PERCENT
  DISCOUNT_FIXED
  FREE
}

enum LogicOperator {
  AND
  OR
}

enum ConditionCategory {
  STATE_CHECK
  NUMERIC
}

enum ConditionSubject {
  ITEM_SELECTED
  ITEM_QTY
  GROUP_TOTAL_QTY
}

enum DependencyTargetType {
  ITEM
  GROUP
  BUNDLE
}

enum DependencyActionType {
  SHOW
  HIDE
  SET_REQUIRED
  ADJUST_PRICE
}

# ==============================
# Types
# ==============================

type Bundle {
  """The product ID this bundle belongs to"""
  productId: ID!
  groups: [BundleGroup!]!
  pricingTemplates: [BundlePricingTemplate!]!
}

type BundleGroup implements Node {
  id: ID!
  title: String!
  sortIndex: Int!
  minSelection: Int
  maxSelection: Int
  items: [BundleItem!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type BundleItem implements Node {
  id: ID!
  itemType: BundleItemType!
  sortIndex: Int!
  refProductId: ID
  refVariantId: ID
  title: String
  featuredImageId: ID
  excludedVariantIds: [ID!]
  minQty: Int!
  maxQty: Int
  defaultQty: Int!
  priceType: BundlePriceType
  priceValue: Int
  pricingTemplate: BundlePricingTemplate
  visible: Boolean!
  selected: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type BundlePricingTemplate implements Node {
  id: ID!
  name: String!
  priceType: BundlePriceType!
  priceValue: Int
  sortIndex: Int!
}

type DependencyRule implements Node {
  id: ID!
  name: String!
  enabled: Boolean!
  priority: Int!
  logicOperator: LogicOperator!
  conditionGroups: [ConditionGroup!]!
  actions: [DependencyAction!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ConditionGroup implements Node {
  id: ID!
  logicOperator: LogicOperator!
  sortIndex: Int!
  conditions: [Condition!]!
}

type Condition implements Node {
  id: ID!
  category: ConditionCategory!
  subject: ConditionSubject!
  operator: String!
  targetType: DependencyTargetType!
  targetId: ID!
  value: Int
  sortIndex: Int!
}

type DependencyAction implements Node {
  id: ID!
  actionType: DependencyActionType!
  targetType: DependencyTargetType!
  targetId: ID
  requiredValue: Boolean
  priceType: BundlePriceType
  priceValue: Int
  stackable: Boolean!
  sortIndex: Int!
}

# ==============================
# Inputs
# ==============================

input BundleGroupCreateInput {
  productId: ID!
  title: String!
  sortIndex: Int
  minSelection: Int
  maxSelection: Int
}

input BundleGroupUpdateInput {
  id: ID!
  title: String
  minSelection: Int
  maxSelection: Int
}

input BundleGroupDeleteInput {
  id: ID!
}

input BundleGroupReorderInput {
  productId: ID!
  groupIds: [ID!]!
}

input BundleItemCreateInput {
  groupId: ID!
  itemType: BundleItemType!
  refProductId: ID
  refVariantId: ID
  title: String
  featuredImageId: ID
  excludedVariantIds: [ID!]
  minQty: Int
  maxQty: Int
  defaultQty: Int
  priceType: BundlePriceType
  priceValue: Int
  pricingTemplateId: ID
  visible: Boolean
  selected: Boolean
}

input BundleItemUpdateInput {
  id: ID!
  title: String
  featuredImageId: ID
  excludedVariantIds: [ID!]
  minQty: Int
  maxQty: Int
  defaultQty: Int
  priceType: BundlePriceType
  priceValue: Int
  pricingTemplateId: ID
  visible: Boolean
  selected: Boolean
}

input BundleItemDeleteInput {
  id: ID!
}

input BundleItemReorderInput {
  groupId: ID!
  itemIds: [ID!]!
}

input BundlePricingTemplateCreateInput {
  productId: ID!
  name: String!
  priceType: BundlePriceType!
  priceValue: Int
  sortIndex: Int
}

input BundlePricingTemplateUpdateInput {
  id: ID!
  name: String
  priceType: BundlePriceType
  priceValue: Int
  sortIndex: Int
}

input BundlePricingTemplateDeleteInput {
  id: ID!
}

input DependencyRuleCreateInput {
  productId: ID!
  name: String!
  enabled: Boolean
  priority: Int
  logicOperator: LogicOperator
  conditionGroups: [ConditionGroupInput!]
  actions: [DependencyActionInput!]
}

input DependencyRuleUpdateInput {
  id: ID!
  name: String
  enabled: Boolean
  priority: Int
  logicOperator: LogicOperator
  conditionGroups: [ConditionGroupInput!]
  actions: [DependencyActionInput!]
}

input DependencyRuleDeleteInput {
  id: ID!
}

input ConditionGroupInput {
  id: ID
  logicOperator: LogicOperator
  sortIndex: Int
  conditions: [ConditionInput!]!
}

input ConditionInput {
  id: ID
  category: ConditionCategory!
  subject: ConditionSubject!
  operator: String!
  targetType: DependencyTargetType!
  targetId: ID!
  value: Int
  sortIndex: Int
}

input DependencyActionInput {
  id: ID
  actionType: DependencyActionType!
  targetType: DependencyTargetType!
  targetId: ID
  requiredValue: Boolean
  priceType: BundlePriceType
  priceValue: Int
  stackable: Boolean
  sortIndex: Int
}

# ==============================
# Payloads
# ==============================

type BundleGroupPayload {
  bundleGroup: BundleGroup
  userErrors: [GenericUserError!]!
}

type BundleGroupDeletePayload {
  deletedBundleGroupId: ID
  userErrors: [GenericUserError!]!
}

type BundleGroupReorderPayload {
  groups: [BundleGroup!]
  userErrors: [GenericUserError!]!
}

type BundleItemPayload {
  bundleItem: BundleItem
  userErrors: [GenericUserError!]!
}

type BundleItemDeletePayload {
  deletedBundleItemId: ID
  userErrors: [GenericUserError!]!
}

type BundleItemReorderPayload {
  items: [BundleItem!]
  userErrors: [GenericUserError!]!
}

type BundlePricingTemplatePayload {
  bundlePricingTemplate: BundlePricingTemplate
  userErrors: [GenericUserError!]!
}

type BundlePricingTemplateDeletePayload {
  deletedBundlePricingTemplateId: ID
  userErrors: [GenericUserError!]!
}

type DependencyRulePayload {
  dependencyRule: DependencyRule
  userErrors: [GenericUserError!]!
}

type DependencyRuleDeletePayload {
  deletedDependencyRuleId: ID
  userErrors: [GenericUserError!]!
}
```

### 4.2 Register Schema in Server

**File:** `/services/catalog/src/api/graphql-admin/server.ts`

Add `bundle.graphql` to the `schemaFiles` array:

```typescript
const schemaFiles = [
  // ... existing files
  "bundle.graphql",  // Add after variant.graphql
  // Generated schemas
  "__generated__/base-filters.graphql",
  "__generated__/filters.graphql",
];
```

---

## Phase 5: Zod Validation Schemas

### 5.1 Bundle Validation Schemas

**File:** `/services/catalog/src/resolvers/admin/validation/bundleSchemas.ts`

```typescript
import { z } from "zod";

// ==============================
// Enums as Zod literals
// ==============================

export const BundleItemTypeSchema = z.enum(["PRODUCT", "VARIANT"]);
export const BundlePriceTypeSchema = z.enum(["BASE", "FIXED", "DISCOUNT_PERCENT", "DISCOUNT_FIXED", "FREE"]);
export const LogicOperatorSchema = z.enum(["AND", "OR"]);
export const ConditionCategorySchema = z.enum(["STATE_CHECK", "NUMERIC"]);
export const ConditionSubjectSchema = z.enum(["ITEM_SELECTED", "ITEM_QTY", "GROUP_TOTAL_QTY"]);
export const DependencyTargetTypeSchema = z.enum(["ITEM", "GROUP", "BUNDLE"]);
export const DependencyActionTypeSchema = z.enum(["SHOW", "HIDE", "SET_REQUIRED", "ADJUST_PRICE"]);

// ==============================
// BundleGroup Schemas
// ==============================

export const BundleGroupCreateInputSchema = () =>
  z.object({
    productId: z.string().min(1, "Product ID is required"),
    title: z.string().min(1, "Title is required").max(255),
    sortIndex: z.number().int().nonnegative().optional(),
    minSelection: z.number().int().nonnegative().optional(),
    maxSelection: z.number().int().positive().optional(),
  }).refine(
    (data) => {
      if (data.minSelection != null && data.maxSelection != null) {
        return data.maxSelection >= data.minSelection;
      }
      return true;
    },
    { message: "maxSelection must be >= minSelection" }
  );

export const BundleGroupUpdateInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
    title: z.string().min(1).max(255).optional(),
    minSelection: z.number().int().nonnegative().nullable().optional(),
    maxSelection: z.number().int().positive().nullable().optional(),
  });

export const BundleGroupDeleteInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
  });

export const BundleGroupReorderInputSchema = () =>
  z.object({
    productId: z.string().min(1, "Product ID is required"),
    groupIds: z.array(z.string()).min(1, "At least one group ID required"),
  });

// ==============================
// BundleItem Schemas
// ==============================

export const BundleItemCreateInputSchema = () =>
  z.object({
    groupId: z.string().min(1, "Group ID is required"),
    itemType: BundleItemTypeSchema,
    refProductId: z.string().optional(),
    refVariantId: z.string().optional(),
    title: z.string().max(255).optional(),
    featuredImageId: z.string().optional(),
    excludedVariantIds: z.array(z.string()).optional(),
    minQty: z.number().int().positive().optional(),
    maxQty: z.number().int().positive().optional(),
    defaultQty: z.number().int().positive().optional(),
    priceType: BundlePriceTypeSchema.optional(),
    priceValue: z.number().int().optional(),
    pricingTemplateId: z.string().optional(),
    visible: z.boolean().optional(),
    selected: z.boolean().optional(),
  }).refine(
    (data) => {
      if (data.itemType === "PRODUCT" && !data.refProductId) {
        return false;
      }
      if (data.itemType === "VARIANT" && !data.refVariantId) {
        return false;
      }
      return true;
    },
    { message: "refProductId required for PRODUCT type, refVariantId required for VARIANT type" }
  ).refine(
    (data) => {
      // Cannot set both direct pricing and template
      if (data.priceType && data.pricingTemplateId) {
        return false;
      }
      return true;
    },
    { message: "Cannot set both priceType and pricingTemplateId" }
  ).refine(
    (data) => {
      if (data.minQty != null && data.maxQty != null) {
        return data.maxQty >= data.minQty;
      }
      return true;
    },
    { message: "maxQty must be >= minQty" }
  );

export const BundleItemUpdateInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
    title: z.string().max(255).nullable().optional(),
    featuredImageId: z.string().nullable().optional(),
    excludedVariantIds: z.array(z.string()).optional(),
    minQty: z.number().int().positive().optional(),
    maxQty: z.number().int().positive().nullable().optional(),
    defaultQty: z.number().int().positive().optional(),
    priceType: BundlePriceTypeSchema.nullable().optional(),
    priceValue: z.number().int().nullable().optional(),
    pricingTemplateId: z.string().nullable().optional(),
    visible: z.boolean().optional(),
    selected: z.boolean().optional(),
  });

export const BundleItemDeleteInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
  });

export const BundleItemReorderInputSchema = () =>
  z.object({
    groupId: z.string().min(1, "Group ID is required"),
    itemIds: z.array(z.string()).min(1, "At least one item ID required"),
  });

// ==============================
// BundlePricingTemplate Schemas
// ==============================

export const BundlePricingTemplateCreateInputSchema = () =>
  z.object({
    productId: z.string().min(1, "Product ID is required"),
    name: z.string().min(1, "Name is required").max(255),
    priceType: BundlePriceTypeSchema,
    priceValue: z.number().int().optional(),
    sortIndex: z.number().int().nonnegative().optional(),
  }).refine(
    (data) => {
      // priceValue required for FIXED, DISCOUNT_PERCENT, DISCOUNT_FIXED
      if (["FIXED", "DISCOUNT_PERCENT", "DISCOUNT_FIXED"].includes(data.priceType)) {
        return data.priceValue != null;
      }
      // priceValue must be null for BASE, FREE
      if (["BASE", "FREE"].includes(data.priceType)) {
        return data.priceValue == null;
      }
      return true;
    },
    { message: "priceValue required for FIXED/DISCOUNT types, must be null for BASE/FREE" }
  );

export const BundlePricingTemplateUpdateInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
    name: z.string().min(1).max(255).optional(),
    priceType: BundlePriceTypeSchema.optional(),
    priceValue: z.number().int().nullable().optional(),
    sortIndex: z.number().int().nonnegative().optional(),
  });

export const BundlePricingTemplateDeleteInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
  });

// ==============================
// DependencyRule Schemas
// ==============================

export const ConditionInputSchema = () =>
  z.object({
    id: z.string().optional(),
    category: ConditionCategorySchema,
    subject: ConditionSubjectSchema,
    operator: z.string().min(1),
    targetType: DependencyTargetTypeSchema,
    targetId: z.string().min(1),
    value: z.number().int().optional(),
    sortIndex: z.number().int().nonnegative().optional(),
  }).refine(
    (data) => {
      // value required for NUMERIC conditions
      if (data.category === "NUMERIC" && data.value == null) {
        return false;
      }
      return true;
    },
    { message: "value is required for NUMERIC conditions" }
  );

export const ConditionGroupInputSchema = () =>
  z.object({
    id: z.string().optional(),
    logicOperator: LogicOperatorSchema.optional(),
    sortIndex: z.number().int().nonnegative().optional(),
    conditions: z.array(ConditionInputSchema()).min(1, "At least one condition required"),
  });

export const DependencyActionInputSchema = () =>
  z.object({
    id: z.string().optional(),
    actionType: DependencyActionTypeSchema,
    targetType: DependencyTargetTypeSchema,
    targetId: z.string().optional(),
    requiredValue: z.boolean().optional(),
    priceType: BundlePriceTypeSchema.optional(),
    priceValue: z.number().int().optional(),
    stackable: z.boolean().optional(),
    sortIndex: z.number().int().nonnegative().optional(),
  }).refine(
    (data) => {
      // targetId required unless targetType is BUNDLE
      if (data.targetType !== "BUNDLE" && !data.targetId) {
        return false;
      }
      return true;
    },
    { message: "targetId required unless targetType is BUNDLE" }
  ).refine(
    (data) => {
      // requiredValue required for SET_REQUIRED
      if (data.actionType === "SET_REQUIRED" && data.requiredValue == null) {
        return false;
      }
      return true;
    },
    { message: "requiredValue required for SET_REQUIRED action" }
  ).refine(
    (data) => {
      // priceType/priceValue required for ADJUST_PRICE
      if (data.actionType === "ADJUST_PRICE" && (!data.priceType || data.priceValue == null)) {
        return false;
      }
      return true;
    },
    { message: "priceType and priceValue required for ADJUST_PRICE action" }
  );

export const DependencyRuleCreateInputSchema = () =>
  z.object({
    productId: z.string().min(1, "Product ID is required"),
    name: z.string().min(1, "Name is required").max(255),
    enabled: z.boolean().optional(),
    priority: z.number().int().nonnegative().optional(),
    logicOperator: LogicOperatorSchema.optional(),
    conditionGroups: z.array(ConditionGroupInputSchema()).optional(),
    actions: z.array(DependencyActionInputSchema()).optional(),
  }).refine(
    (data) => {
      // At least one condition group or action required
      const hasConditions = data.conditionGroups && data.conditionGroups.length > 0;
      const hasActions = data.actions && data.actions.length > 0;
      return hasConditions || hasActions;
    },
    { message: "At least one condition group or action is required" }
  );

export const DependencyRuleUpdateInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
    name: z.string().min(1).max(255).optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().nonnegative().optional(),
    logicOperator: LogicOperatorSchema.optional(),
    conditionGroups: z.array(ConditionGroupInputSchema()).optional(),
    actions: z.array(DependencyActionInputSchema()).optional(),
  });

export const DependencyRuleDeleteInputSchema = () =>
  z.object({
    id: z.string().min(1, "ID is required"),
  });
```

---

## Phase 6: DTOs (Separate Files)

### 6.1 DTO File Structure

Create the following structure in `/services/catalog/src/scripts/bundle/dto/`:

```
dto/
├── shared.ts
├── BundleGroupCreateDto.ts
├── BundleGroupUpdateDto.ts
├── BundleGroupDeleteDto.ts
├── BundleGroupReorderDto.ts
├── BundleItemCreateDto.ts
├── BundleItemUpdateDto.ts
├── BundleItemDeleteDto.ts
├── BundleItemReorderDto.ts
├── BundlePricingTemplateCreateDto.ts
├── BundlePricingTemplateUpdateDto.ts
├── BundlePricingTemplateDeleteDto.ts
├── DependencyRuleCreateDto.ts
├── DependencyRuleUpdateDto.ts
├── DependencyRuleDeleteDto.ts
└── index.ts
```

### 6.2 Shared Types

**File:** `/services/catalog/src/scripts/bundle/dto/shared.ts`

```typescript
import type { UserError } from "../../../kernel/BaseScript.js";

export interface BundleResultBase {
  userErrors: UserError[];
}

export interface ConditionGroupInput {
  id?: string;
  logicOperator?: string;
  sortIndex?: number;
  conditions: ConditionInput[];
}

export interface ConditionInput {
  id?: string;
  category: string;
  subject: string;
  operator: string;
  targetType: string;
  targetId: string;
  value?: number;
  sortIndex?: number;
}

export interface DependencyActionInput {
  id?: string;
  actionType: string;
  targetType: string;
  targetId?: string;
  requiredValue?: boolean;
  priceType?: string;
  priceValue?: number;
  stackable?: boolean;
  sortIndex?: number;
}
```

### 6.3 BundleGroup DTOs

**File:** `/services/catalog/src/scripts/bundle/dto/BundleGroupCreateDto.ts`

```typescript
import type { BundleGroup } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundleGroupCreateParams {
  readonly productId: string;
  readonly title: string;
  readonly sortIndex?: number;
  readonly minSelection?: number | null;
  readonly maxSelection?: number | null;
}

export interface BundleGroupCreateResult extends BundleResultBase {
  bundleGroup?: BundleGroup;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundleGroupUpdateDto.ts`

```typescript
import type { BundleGroup } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundleGroupUpdateParams {
  readonly id: string;
  readonly title?: string;
  readonly minSelection?: number | null;
  readonly maxSelection?: number | null;
}

export interface BundleGroupUpdateResult extends BundleResultBase {
  bundleGroup?: BundleGroup;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundleGroupDeleteDto.ts`

```typescript
import type { BundleResultBase } from "./shared.js";

export interface BundleGroupDeleteParams {
  readonly id: string;
}

export interface BundleGroupDeleteResult extends BundleResultBase {
  deletedBundleGroupId?: string;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundleGroupReorderDto.ts`

```typescript
import type { BundleGroup } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundleGroupReorderParams {
  readonly productId: string;
  readonly groupIds: string[];
}

export interface BundleGroupReorderResult extends BundleResultBase {
  groups?: BundleGroup[];
}
```

### 6.4 BundleItem DTOs

**File:** `/services/catalog/src/scripts/bundle/dto/BundleItemCreateDto.ts`

```typescript
import type { BundleItem } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundleItemCreateParams {
  readonly groupId: string;
  readonly itemType: "PRODUCT" | "VARIANT";
  readonly refProductId?: string;
  readonly refVariantId?: string;
  readonly title?: string;
  readonly featuredImageId?: string;
  readonly excludedVariantIds?: string[];
  readonly minQty?: number;
  readonly maxQty?: number;
  readonly defaultQty?: number;
  readonly priceType?: string;
  readonly priceValue?: number;
  readonly pricingTemplateId?: string;
  readonly visible?: boolean;
  readonly selected?: boolean;
}

export interface BundleItemCreateResult extends BundleResultBase {
  bundleItem?: BundleItem;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundleItemUpdateDto.ts`

```typescript
import type { BundleItem } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundleItemUpdateParams {
  readonly id: string;
  readonly title?: string | null;
  readonly featuredImageId?: string | null;
  readonly excludedVariantIds?: string[];
  readonly minQty?: number;
  readonly maxQty?: number | null;
  readonly defaultQty?: number;
  readonly priceType?: string | null;
  readonly priceValue?: number | null;
  readonly pricingTemplateId?: string | null;
  readonly visible?: boolean;
  readonly selected?: boolean;
}

export interface BundleItemUpdateResult extends BundleResultBase {
  bundleItem?: BundleItem;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundleItemDeleteDto.ts`

```typescript
import type { BundleResultBase } from "./shared.js";

export interface BundleItemDeleteParams {
  readonly id: string;
}

export interface BundleItemDeleteResult extends BundleResultBase {
  deletedBundleItemId?: string;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundleItemReorderDto.ts`

```typescript
import type { BundleItem } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundleItemReorderParams {
  readonly groupId: string;
  readonly itemIds: string[];
}

export interface BundleItemReorderResult extends BundleResultBase {
  items?: BundleItem[];
}
```

### 6.5 BundlePricingTemplate DTOs

**File:** `/services/catalog/src/scripts/bundle/dto/BundlePricingTemplateCreateDto.ts`

```typescript
import type { BundlePricingTemplate } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundlePricingTemplateCreateParams {
  readonly productId: string;
  readonly name: string;
  readonly priceType: string;
  readonly priceValue?: number;
  readonly sortIndex?: number;
}

export interface BundlePricingTemplateCreateResult extends BundleResultBase {
  bundlePricingTemplate?: BundlePricingTemplate;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundlePricingTemplateUpdateDto.ts`

```typescript
import type { BundlePricingTemplate } from "../../../repositories/models/index.js";
import type { BundleResultBase } from "./shared.js";

export interface BundlePricingTemplateUpdateParams {
  readonly id: string;
  readonly name?: string;
  readonly priceType?: string;
  readonly priceValue?: number | null;
  readonly sortIndex?: number;
}

export interface BundlePricingTemplateUpdateResult extends BundleResultBase {
  bundlePricingTemplate?: BundlePricingTemplate;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/BundlePricingTemplateDeleteDto.ts`

```typescript
import type { BundleResultBase } from "./shared.js";

export interface BundlePricingTemplateDeleteParams {
  readonly id: string;
}

export interface BundlePricingTemplateDeleteResult extends BundleResultBase {
  deletedBundlePricingTemplateId?: string;
}
```

### 6.6 DependencyRule DTOs

**File:** `/services/catalog/src/scripts/bundle/dto/DependencyRuleCreateDto.ts`

```typescript
import type { DependencyRule } from "../../../repositories/models/index.js";
import type { BundleResultBase, ConditionGroupInput, DependencyActionInput } from "./shared.js";

export interface DependencyRuleCreateParams {
  readonly productId: string;
  readonly name: string;
  readonly enabled?: boolean;
  readonly priority?: number;
  readonly logicOperator?: string;
  readonly conditionGroups?: ConditionGroupInput[];
  readonly actions?: DependencyActionInput[];
}

export interface DependencyRuleCreateResult extends BundleResultBase {
  dependencyRule?: DependencyRule;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/DependencyRuleUpdateDto.ts`

```typescript
import type { DependencyRule } from "../../../repositories/models/index.js";
import type { BundleResultBase, ConditionGroupInput, DependencyActionInput } from "./shared.js";

export interface DependencyRuleUpdateParams {
  readonly id: string;
  readonly name?: string;
  readonly enabled?: boolean;
  readonly priority?: number;
  readonly logicOperator?: string;
  readonly conditionGroups?: ConditionGroupInput[];
  readonly actions?: DependencyActionInput[];
}

export interface DependencyRuleUpdateResult extends BundleResultBase {
  dependencyRule?: DependencyRule;
}
```

**File:** `/services/catalog/src/scripts/bundle/dto/DependencyRuleDeleteDto.ts`

```typescript
import type { BundleResultBase } from "./shared.js";

export interface DependencyRuleDeleteParams {
  readonly id: string;
}

export interface DependencyRuleDeleteResult extends BundleResultBase {
  deletedDependencyRuleId?: string;
}
```

### 6.7 DTO Index

**File:** `/services/catalog/src/scripts/bundle/dto/index.ts`

```typescript
// Shared types
export type {
  BundleResultBase,
  ConditionGroupInput,
  ConditionInput,
  DependencyActionInput,
} from "./shared.js";

// BundleGroup DTOs
export type {
  BundleGroupCreateParams,
  BundleGroupCreateResult,
} from "./BundleGroupCreateDto.js";

export type {
  BundleGroupUpdateParams,
  BundleGroupUpdateResult,
} from "./BundleGroupUpdateDto.js";

export type {
  BundleGroupDeleteParams,
  BundleGroupDeleteResult,
} from "./BundleGroupDeleteDto.js";

export type {
  BundleGroupReorderParams,
  BundleGroupReorderResult,
} from "./BundleGroupReorderDto.js";

// BundleItem DTOs
export type {
  BundleItemCreateParams,
  BundleItemCreateResult,
} from "./BundleItemCreateDto.js";

export type {
  BundleItemUpdateParams,
  BundleItemUpdateResult,
} from "./BundleItemUpdateDto.js";

export type {
  BundleItemDeleteParams,
  BundleItemDeleteResult,
} from "./BundleItemDeleteDto.js";

export type {
  BundleItemReorderParams,
  BundleItemReorderResult,
} from "./BundleItemReorderDto.js";

// BundlePricingTemplate DTOs
export type {
  BundlePricingTemplateCreateParams,
  BundlePricingTemplateCreateResult,
} from "./BundlePricingTemplateCreateDto.js";

export type {
  BundlePricingTemplateUpdateParams,
  BundlePricingTemplateUpdateResult,
} from "./BundlePricingTemplateUpdateDto.js";

export type {
  BundlePricingTemplateDeleteParams,
  BundlePricingTemplateDeleteResult,
} from "./BundlePricingTemplateDeleteDto.js";

// DependencyRule DTOs
export type {
  DependencyRuleCreateParams,
  DependencyRuleCreateResult,
} from "./DependencyRuleCreateDto.js";

export type {
  DependencyRuleUpdateParams,
  DependencyRuleUpdateResult,
} from "./DependencyRuleUpdateDto.js";

export type {
  DependencyRuleDeleteParams,
  DependencyRuleDeleteResult,
} from "./DependencyRuleDeleteDto.js";
```

---

## Phase 7: Scripts (Business Logic)

### 7.1 Script Files

Create the following script files in `/services/catalog/src/scripts/bundle/`:

Each script extends `BaseScript` and uses `@Policy` decorator for authorization:

```typescript
// Example: BundleGroupCreateScript.ts
import { Policy } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundleGroupCreateParams, BundleGroupCreateResult } from "./dto/index.js";

export class BundleGroupCreateScript extends BaseScript<BundleGroupCreateParams, BundleGroupCreateResult> {
  @Policy({ resource: "bundle", action: "manage" })
  async execute(params: BundleGroupCreateParams): Promise<BundleGroupCreateResult> {
    // 1. Validate productId exists (optional - can trust input)
    // 2. Get max sortIndex for product if not provided
    // 3. Create bundle group
    // 4. Return result
  }
}
```

**Scripts to create:**

1. **BundleGroupCreateScript.ts** - Create bundle group with auto sortIndex
2. **BundleGroupUpdateScript.ts** - Update bundle group fields
3. **BundleGroupDeleteScript.ts** - Delete bundle group (items cascade via FK)
4. **BundleGroupReorderScript.ts** - Batch update sortIndex for groups
5. **BundleItemCreateScript.ts** - Create bundle item with validation
6. **BundleItemUpdateScript.ts** - Update bundle item fields
7. **BundleItemDeleteScript.ts** - Delete bundle item
8. **BundleItemReorderScript.ts** - Batch update sortIndex for items
9. **BundlePricingTemplateCreateScript.ts** - Create pricing template
10. **BundlePricingTemplateUpdateScript.ts** - Update pricing template
11. **BundlePricingTemplateDeleteScript.ts** - Delete pricing template
12. **DependencyRuleCreateScript.ts** - Create rule with nested conditions/actions (use `@Transactional`)
13. **DependencyRuleUpdateScript.ts** - Sync conditions/actions (delete removed, update existing, create new)
14. **DependencyRuleDeleteScript.ts** - Delete rule (conditions/actions cascade via FK)

### 7.2 Transaction Handling

For `DependencyRuleCreateScript` and `DependencyRuleUpdateScript`, use `@Transactional` decorator:

```typescript
import { Policy, Transactional } from "@shopana/shared-kernel";

export class DependencyRuleCreateScript extends BaseScript<...> {
  @Policy({ resource: "bundle", action: "manage" })
  @Transactional()
  async execute(params: DependencyRuleCreateParams): Promise<DependencyRuleCreateResult> {
    // 1. Create dependency rule
    // 2. Create condition groups
    // 3. Create conditions for each group
    // 4. Create actions
    // All in single transaction
  }
}
```

### 7.3 Script Index

**File:** `/services/catalog/src/scripts/bundle/index.ts`

```typescript
export * from "./dto/index.js";
export * from "./BundleGroupCreateScript.js";
export * from "./BundleGroupUpdateScript.js";
export * from "./BundleGroupDeleteScript.js";
export * from "./BundleGroupReorderScript.js";
export * from "./BundleItemCreateScript.js";
export * from "./BundleItemUpdateScript.js";
export * from "./BundleItemDeleteScript.js";
export * from "./BundleItemReorderScript.js";
export * from "./BundlePricingTemplateCreateScript.js";
export * from "./BundlePricingTemplateUpdateScript.js";
export * from "./BundlePricingTemplateDeleteScript.js";
export * from "./DependencyRuleCreateScript.js";
export * from "./DependencyRuleUpdateScript.js";
export * from "./DependencyRuleDeleteScript.js";
```

---

## Phase 8: Resolvers

### 8.1 Type Resolvers

**File:** `/services/catalog/src/resolvers/admin/BundleGroupResolver.ts`

Following `CollectionResolver.ts` pattern with DataLoader usage:

```typescript
import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { BundleGroup } from "../../repositories/models/index.js";
import { BundleItemResolver } from "./BundleItemResolver.js";

export class BundleGroupResolver extends CatalogType<string, BundleGroup> {
  async $preload() {
    return await this.$ctx.loaders.bundle.bundleGroup.load(this.$props);
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.BundleGroup);
  }

  async title() {
    return this.$get("title");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }

  async minSelection() {
    return this.$get("minSelection");
  }

  async maxSelection() {
    return this.$get("maxSelection");
  }

  async items() {
    const items = await this.$ctx.loaders.bundle.bundleItemsByGroupId.load(this.$props);
    return items
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map(item => new BundleItemResolver(item.id, this.$ctx));
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
```

Similarly create:
- **BundleItemResolver.ts** - with `pricingTemplate` field using loader
- **BundlePricingTemplateResolver.ts**
- **DependencyRuleResolver.ts** - with `conditionGroups` and `actions` using loaders
- **ConditionGroupResolver.ts** - with `conditions` using loader
- **ConditionResolver.ts**
- **DependencyActionResolver.ts**
- **BundleResolver.ts** - Aggregate resolver with `groups` and `pricingTemplates`

### 8.2 BundleResolver (Aggregate)

**File:** `/services/catalog/src/resolvers/admin/BundleResolver.ts`

```typescript
import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import { BundleGroupResolver } from "./BundleGroupResolver.js";
import { BundlePricingTemplateResolver } from "./BundlePricingTemplateResolver.js";

export class BundleResolver extends CatalogType<string, null> {
  // $props is productId, no preload needed
  async $preload() {
    return null;
  }

  productId() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Product);
  }

  async groups() {
    const groups = await this.$ctx.loaders.bundle.bundleGroupsByProductId.load(this.$props);
    return groups
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map(group => new BundleGroupResolver(group.id, this.$ctx));
  }

  async pricingTemplates() {
    const templates = await this.$ctx.loaders.bundle.bundlePricingTemplatesByProductId.load(this.$props);
    return templates
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map(template => new BundlePricingTemplateResolver(template.id, this.$ctx));
  }
}
```

### 8.3 Update GlobalIdEntity

**File:** `/packages/shared-graphql-guid/src/index.ts`

Add new entity types:
```typescript
export enum GlobalIdEntity {
  // ... existing entities

  // Bundles
  BundleGroup = "BundleGroup",
  BundleItem = "BundleItem",
  BundlePricingTemplate = "BundlePricingTemplate",
  DependencyRule = "DependencyRule",
  ConditionGroup = "ConditionGroup",
  Condition = "Condition",
  DependencyAction = "DependencyAction",
}
```

### 8.4 Update QueryResolver

**File:** `/services/catalog/src/resolvers/admin/QueryResolver.ts`

Add query methods to `CatalogQueryResolver`:

```typescript
import { safeDecodeGlobalId, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { BundleResolver } from "./BundleResolver.js";
import { BundlePricingTemplateResolver } from "./BundlePricingTemplateResolver.js";
import { DependencyRuleResolver } from "./DependencyRuleResolver.js";

// In CatalogQueryResolver class:

async bundle(args: { productId: string }) {
  const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
  if (!productId) return null;

  // Check if product has any bundle groups
  const groups = await this.$ctx.loaders.bundle.bundleGroupsByProductId.load(productId);
  if (groups.length === 0) return null;

  return new BundleResolver(productId, this.$ctx);
}

async bundlePricingTemplates(args: { productId: string }) {
  const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
  if (!productId) return [];

  const templates = await this.$ctx.loaders.bundle.bundlePricingTemplatesByProductId.load(productId);
  return templates
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map(t => new BundlePricingTemplateResolver(t.id, this.$ctx));
}

async dependencyRules(args: { productId: string }) {
  const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
  if (!productId) return [];

  const rules = await this.$ctx.loaders.bundle.dependencyRulesByProductId.load(productId);
  return rules
    .sort((a, b) => a.priority - b.priority)
    .map(r => new DependencyRuleResolver(r.id, this.$ctx));
}
```

### 8.5 Update MutationResolver

**File:** `/services/catalog/src/resolvers/admin/MutationResolver.ts`

Add mutation methods with `@ZodResolver` decorators:

```typescript
import { ZodResolver } from "@shopana/type-resolver";
import {
  BundleGroupCreateInputSchema,
  BundleGroupUpdateInputSchema,
  BundleGroupDeleteInputSchema,
  BundleGroupReorderInputSchema,
  BundleItemCreateInputSchema,
  BundleItemUpdateInputSchema,
  BundleItemDeleteInputSchema,
  BundleItemReorderInputSchema,
  BundlePricingTemplateCreateInputSchema,
  BundlePricingTemplateUpdateInputSchema,
  BundlePricingTemplateDeleteInputSchema,
  DependencyRuleCreateInputSchema,
  DependencyRuleUpdateInputSchema,
  DependencyRuleDeleteInputSchema,
} from "./validation/bundleSchemas.js";

// Import scripts and resolvers
import {
  BundleGroupCreateScript,
  BundleGroupUpdateScript,
  BundleGroupDeleteScript,
  BundleGroupReorderScript,
  // ... etc
} from "../../scripts/bundle/index.js";

import { BundleGroupResolver } from "./BundleGroupResolver.js";
// ... etc

// In CatalogMutationResolver class:

// ---- Bundle Group Mutations ----
@ZodResolver(BundleGroupCreateInputSchema())
async bundleGroupCreate(args: { input: BundleGroupCreateInput }) {
  const script = new BundleGroupCreateScript(this.$ctx.kernel.getServices());
  const result = await script.run({
    productId: safeDecodeGlobalId(args.input.productId, GlobalIdEntity.Product)!,
    title: args.input.title,
    sortIndex: args.input.sortIndex ?? undefined,
    minSelection: args.input.minSelection,
    maxSelection: args.input.maxSelection,
  });
  return {
    bundleGroup: result.bundleGroup
      ? new BundleGroupResolver(result.bundleGroup.id, this.$ctx)
      : null,
    userErrors: result.userErrors,
  };
}

@ZodResolver(BundleGroupUpdateInputSchema())
async bundleGroupUpdate(args: { input: BundleGroupUpdateInput }) {
  // Similar pattern
}

@ZodResolver(BundleGroupDeleteInputSchema())
async bundleGroupDelete(args: { input: BundleGroupDeleteInput }) {
  // Similar pattern
}

@ZodResolver(BundleGroupReorderInputSchema())
async bundleGroupReorder(args: { input: BundleGroupReorderInput }) {
  // Similar pattern
}

// ---- Bundle Item Mutations ----
// ... similar pattern for all item mutations

// ---- Pricing Template Mutations ----
// ... similar pattern for all template mutations

// ---- Dependency Rule Mutations ----
// ... similar pattern for all rule mutations
```

---

## Phase 9: Codegen and Build

1. Run GraphQL codegen: `pnpm codegen` (generates TypeScript types from GraphQL schema)
2. Build packages: `pnpm build`
3. Run DB migration: `pnpm db:generate && pnpm db:migrate`

---

## File Creation Summary

### New Files

| Path | Description |
|------|-------------|
| `src/repositories/models/bundle.ts` | Drizzle schema definitions |
| `src/repositories/bundle/BundleGroupRepository.ts` | Bundle group CRUD |
| `src/repositories/bundle/BundleItemRepository.ts` | Bundle item CRUD |
| `src/repositories/bundle/BundlePricingTemplateRepository.ts` | Pricing template CRUD |
| `src/repositories/bundle/DependencyRuleRepository.ts` | Dependency rule CRUD |
| `src/repositories/bundle/ConditionGroupRepository.ts` | Condition group CRUD |
| `src/repositories/bundle/ConditionRepository.ts` | Condition CRUD |
| `src/repositories/bundle/DependencyActionRepository.ts` | Dependency action CRUD |
| `src/repositories/bundle/index.ts` | Repository exports |
| `src/loaders/BundleLoader.ts` | DataLoader for batching |
| `src/api/graphql-admin/schema/bundle.graphql` | GraphQL schema |
| `src/resolvers/admin/validation/bundleSchemas.ts` | Zod validation schemas |
| `src/scripts/bundle/dto/shared.ts` | Shared DTO types |
| `src/scripts/bundle/dto/BundleGroupCreateDto.ts` | Create group DTO |
| `src/scripts/bundle/dto/BundleGroupUpdateDto.ts` | Update group DTO |
| `src/scripts/bundle/dto/BundleGroupDeleteDto.ts` | Delete group DTO |
| `src/scripts/bundle/dto/BundleGroupReorderDto.ts` | Reorder groups DTO |
| `src/scripts/bundle/dto/BundleItemCreateDto.ts` | Create item DTO |
| `src/scripts/bundle/dto/BundleItemUpdateDto.ts` | Update item DTO |
| `src/scripts/bundle/dto/BundleItemDeleteDto.ts` | Delete item DTO |
| `src/scripts/bundle/dto/BundleItemReorderDto.ts` | Reorder items DTO |
| `src/scripts/bundle/dto/BundlePricingTemplateCreateDto.ts` | Create template DTO |
| `src/scripts/bundle/dto/BundlePricingTemplateUpdateDto.ts` | Update template DTO |
| `src/scripts/bundle/dto/BundlePricingTemplateDeleteDto.ts` | Delete template DTO |
| `src/scripts/bundle/dto/DependencyRuleCreateDto.ts` | Create rule DTO |
| `src/scripts/bundle/dto/DependencyRuleUpdateDto.ts` | Update rule DTO |
| `src/scripts/bundle/dto/DependencyRuleDeleteDto.ts` | Delete rule DTO |
| `src/scripts/bundle/dto/index.ts` | DTO exports |
| `src/scripts/bundle/BundleGroupCreateScript.ts` | Create group script |
| `src/scripts/bundle/BundleGroupUpdateScript.ts` | Update group script |
| `src/scripts/bundle/BundleGroupDeleteScript.ts` | Delete group script |
| `src/scripts/bundle/BundleGroupReorderScript.ts` | Reorder groups script |
| `src/scripts/bundle/BundleItemCreateScript.ts` | Create item script |
| `src/scripts/bundle/BundleItemUpdateScript.ts` | Update item script |
| `src/scripts/bundle/BundleItemDeleteScript.ts` | Delete item script |
| `src/scripts/bundle/BundleItemReorderScript.ts` | Reorder items script |
| `src/scripts/bundle/BundlePricingTemplateCreateScript.ts` | Create template script |
| `src/scripts/bundle/BundlePricingTemplateUpdateScript.ts` | Update template script |
| `src/scripts/bundle/BundlePricingTemplateDeleteScript.ts` | Delete template script |
| `src/scripts/bundle/DependencyRuleCreateScript.ts` | Create rule script |
| `src/scripts/bundle/DependencyRuleUpdateScript.ts` | Update rule script |
| `src/scripts/bundle/DependencyRuleDeleteScript.ts` | Delete rule script |
| `src/scripts/bundle/index.ts` | Script exports |
| `src/resolvers/admin/BundleResolver.ts` | Bundle type resolver |
| `src/resolvers/admin/BundleGroupResolver.ts` | BundleGroup type resolver |
| `src/resolvers/admin/BundleItemResolver.ts` | BundleItem type resolver |
| `src/resolvers/admin/BundlePricingTemplateResolver.ts` | Template type resolver |
| `src/resolvers/admin/DependencyRuleResolver.ts` | Rule type resolver |
| `src/resolvers/admin/ConditionGroupResolver.ts` | ConditionGroup type resolver |
| `src/resolvers/admin/ConditionResolver.ts` | Condition type resolver |
| `src/resolvers/admin/DependencyActionResolver.ts` | Action type resolver |

### Modified Files

| Path | Changes |
|------|---------|
| `src/repositories/models/index.ts` | Add bundle export |
| `src/repositories/Repository.ts` | Add bundle repositories |
| `src/loaders/Loader.ts` | Add bundle loaders |
| `src/api/graphql-admin/server.ts` | Add bundle.graphql to schemaFiles |
| `packages/shared-graphql-guid/src/index.ts` | Add GlobalIdEntity values |
| `src/resolvers/admin/QueryResolver.ts` | Add bundle queries |
| `src/resolvers/admin/MutationResolver.ts` | Add bundle mutations with @ZodResolver |

---

## Validation Rules

### BundleGroup
- `title` is required, non-empty, max 255 chars
- `minSelection` must be >= 0 if provided
- `maxSelection` must be >= minSelection if both provided
- `productId` must be valid GlobalId

### BundleItem
- `groupId` must reference an existing BundleGroup
- `itemType` must be "PRODUCT" or "VARIANT"
- If `itemType` is "PRODUCT", `refProductId` is required
- If `itemType` is "VARIANT", `refVariantId` is required
- `minQty` must be >= 1
- `maxQty` must be >= minQty if provided
- `defaultQty` must be within [minQty, maxQty] range
- `priceType` must be valid BundlePriceType if provided
- Cannot set both `priceType/priceValue` and `pricingTemplateId`

### BundlePricingTemplate
- `name` is required, non-empty, max 255 chars
- `priceType` must be valid BundlePriceType
- `priceValue` required for FIXED, DISCOUNT_PERCENT, DISCOUNT_FIXED
- `priceValue` must be null for BASE, FREE

### DependencyRule
- `name` is required, non-empty, max 255 chars
- `logicOperator` must be "AND" or "OR"
- At least one condition group or action required

### Condition
- `category` must be valid ConditionCategory
- `subject` must be valid ConditionSubject
- `operator` must be valid for the category
- `targetType` must be valid DependencyTargetType
- `targetId` must reference valid BundleItem or BundleGroup
- `value` required for NUMERIC conditions

### DependencyAction
- `actionType` must be valid DependencyActionType
- `targetType` must be valid DependencyTargetType
- `targetId` required unless targetType is BUNDLE
- `requiredValue` required for SET_REQUIRED
- `priceType`/`priceValue` required for ADJUST_PRICE

---

## Testing Strategy

1. Unit tests for each Script (validation, business logic)
2. Integration tests for Repository methods
3. E2E tests for GraphQL API endpoints
4. Test cascade deletes (group -> items, rule -> conditions/actions)
5. Test reordering operations
6. Test pricing template references
7. Test authorization (@Policy decorator)
