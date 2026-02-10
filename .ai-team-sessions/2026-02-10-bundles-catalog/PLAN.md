# Bundles Implementation Plan

## Overview

This plan implements the Bundles functionality in the catalog service, allowing products to be configured as bundles with groups, items, pricing templates, and dependency rules.

**Service:** catalog
**Pattern:** Script
**Authorization:** @Policy("bundle", "manage")

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

### 2.8 Update Repository Aggregator

**File:** `/services/catalog/src/repositories/Repository.ts`

Add to imports:
```typescript
import { BundleGroupRepository } from "./bundle/BundleGroupRepository.js";
import { BundleItemRepository } from "./bundle/BundleItemRepository.js";
import { BundlePricingTemplateRepository } from "./bundle/BundlePricingTemplateRepository.js";
import { DependencyRuleRepository } from "./bundle/DependencyRuleRepository.js";
import { ConditionGroupRepository } from "./bundle/ConditionGroupRepository.js";
import { ConditionRepository } from "./bundle/ConditionRepository.js";
import { DependencyActionRepository } from "./bundle/DependencyActionRepository.js";
```

Add public fields and initialization in constructor.

---

## Phase 3: DataLoaders

### 3.1 BundleLoader

**File:** `/services/catalog/src/loaders/BundleLoader.ts`

Following `CollectionLoader.ts` pattern:

```typescript
export class BundleLoader {
  public readonly bundleGroup: DataLoader<string, BundleGroup | null>;
  public readonly bundleGroupsByProduct: DataLoader<string, BundleGroup[]>;
  public readonly bundleItem: DataLoader<string, BundleItem | null>;
  public readonly bundleItemsByGroup: DataLoader<string, BundleItem[]>;
  public readonly bundlePricingTemplate: DataLoader<string, BundlePricingTemplate | null>;
  public readonly bundlePricingTemplatesByProduct: DataLoader<string, BundlePricingTemplate[]>;
  public readonly dependencyRule: DataLoader<string, DependencyRule | null>;
  public readonly dependencyRulesByProduct: DataLoader<string, DependencyRule[]>;
  public readonly conditionGroupsByRule: DataLoader<string, ConditionGroup[]>;
  public readonly conditionsByGroup: DataLoader<string, Condition[]>;
  public readonly dependencyActionsByRule: DataLoader<string, DependencyAction[]>;

  constructor(repository: Repository) {
    // Initialize all loaders with batch functions
  }
}
```

### 3.2 Update Loader Aggregator

**File:** `/services/catalog/src/loaders/Loader.ts`

Add BundleLoader fields and initialization.

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

### 4.2 Extend Query and Mutation

**File:** `/services/catalog/src/api/graphql-admin/schema/catalog.graphql` (or existing mutation/query file)

Add to CatalogQuery:
```graphql
extend type CatalogQuery {
  """Get bundle configuration for a product"""
  bundle(productId: ID!): Bundle

  """List pricing templates for a bundle product"""
  bundlePricingTemplates(productId: ID!): [BundlePricingTemplate!]!

  """List dependency rules for a bundle product"""
  dependencyRules(productId: ID!): [DependencyRule!]!
}
```

Add to CatalogMutation:
```graphql
extend type CatalogMutation {
  # Bundle Group mutations
  bundleGroupCreate(input: BundleGroupCreateInput!): BundleGroupPayload!
  bundleGroupUpdate(input: BundleGroupUpdateInput!): BundleGroupPayload!
  bundleGroupDelete(input: BundleGroupDeleteInput!): BundleGroupDeletePayload!
  bundleGroupReorder(input: BundleGroupReorderInput!): BundleGroupReorderPayload!

  # Bundle Item mutations
  bundleItemCreate(input: BundleItemCreateInput!): BundleItemPayload!
  bundleItemUpdate(input: BundleItemUpdateInput!): BundleItemPayload!
  bundleItemDelete(input: BundleItemDeleteInput!): BundleItemDeletePayload!
  bundleItemReorder(input: BundleItemReorderInput!): BundleItemReorderPayload!

  # Pricing Template mutations
  bundlePricingTemplateCreate(input: BundlePricingTemplateCreateInput!): BundlePricingTemplatePayload!
  bundlePricingTemplateUpdate(input: BundlePricingTemplateUpdateInput!): BundlePricingTemplatePayload!
  bundlePricingTemplateDelete(input: BundlePricingTemplateDeleteInput!): BundlePricingTemplateDeletePayload!

  # Dependency Rule mutations
  dependencyRuleCreate(input: DependencyRuleCreateInput!): DependencyRulePayload!
  dependencyRuleUpdate(input: DependencyRuleUpdateInput!): DependencyRulePayload!
  dependencyRuleDelete(input: DependencyRuleDeleteInput!): DependencyRuleDeletePayload!
}
```

---

## Phase 5: Scripts (Business Logic)

### 5.1 DTO Definitions

**File:** `/services/catalog/src/scripts/bundle/dto/index.ts`

```typescript
import type { UserError } from "../../../kernel/BaseScript.js";
import type {
  BundleGroup,
  BundleItem,
  BundlePricingTemplate,
  DependencyRule,
} from "../../../repositories/models/index.js";

// BundleGroup DTOs
export interface BundleGroupCreateParams {
  productId: string;
  title: string;
  sortIndex?: number;
  minSelection?: number | null;
  maxSelection?: number | null;
}

export interface BundleGroupUpdateParams {
  id: string;
  title?: string;
  minSelection?: number | null;
  maxSelection?: number | null;
}

export interface BundleGroupDeleteParams {
  id: string;
}

export interface BundleGroupReorderParams {
  productId: string;
  groupIds: string[];
}

export interface BundleGroupResult {
  bundleGroup?: BundleGroup;
  userErrors: UserError[];
}

export interface BundleGroupDeleteResult {
  deletedBundleGroupId?: string;
  userErrors: UserError[];
}

export interface BundleGroupReorderResult {
  groups?: BundleGroup[];
  userErrors: UserError[];
}

// BundleItem DTOs
export interface BundleItemCreateParams {
  groupId: string;
  itemType: "PRODUCT" | "VARIANT";
  refProductId?: string;
  refVariantId?: string;
  title?: string;
  featuredImageId?: string;
  excludedVariantIds?: string[];
  minQty?: number;
  maxQty?: number;
  defaultQty?: number;
  priceType?: string;
  priceValue?: number;
  pricingTemplateId?: string;
  visible?: boolean;
  selected?: boolean;
}

export interface BundleItemUpdateParams {
  id: string;
  title?: string | null;
  featuredImageId?: string | null;
  excludedVariantIds?: string[];
  minQty?: number;
  maxQty?: number | null;
  defaultQty?: number;
  priceType?: string | null;
  priceValue?: number | null;
  pricingTemplateId?: string | null;
  visible?: boolean;
  selected?: boolean;
}

export interface BundleItemDeleteParams {
  id: string;
}

export interface BundleItemReorderParams {
  groupId: string;
  itemIds: string[];
}

export interface BundleItemResult {
  bundleItem?: BundleItem;
  userErrors: UserError[];
}

export interface BundleItemDeleteResult {
  deletedBundleItemId?: string;
  userErrors: UserError[];
}

export interface BundleItemReorderResult {
  items?: BundleItem[];
  userErrors: UserError[];
}

// BundlePricingTemplate DTOs
export interface BundlePricingTemplateCreateParams {
  productId: string;
  name: string;
  priceType: string;
  priceValue?: number;
  sortIndex?: number;
}

export interface BundlePricingTemplateUpdateParams {
  id: string;
  name?: string;
  priceType?: string;
  priceValue?: number | null;
  sortIndex?: number;
}

export interface BundlePricingTemplateDeleteParams {
  id: string;
}

export interface BundlePricingTemplateResult {
  bundlePricingTemplate?: BundlePricingTemplate;
  userErrors: UserError[];
}

export interface BundlePricingTemplateDeleteResult {
  deletedBundlePricingTemplateId?: string;
  userErrors: UserError[];
}

// DependencyRule DTOs
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

export interface DependencyRuleCreateParams {
  productId: string;
  name: string;
  enabled?: boolean;
  priority?: number;
  logicOperator?: string;
  conditionGroups?: ConditionGroupInput[];
  actions?: DependencyActionInput[];
}

export interface DependencyRuleUpdateParams {
  id: string;
  name?: string;
  enabled?: boolean;
  priority?: number;
  logicOperator?: string;
  conditionGroups?: ConditionGroupInput[];
  actions?: DependencyActionInput[];
}

export interface DependencyRuleDeleteParams {
  id: string;
}

export interface DependencyRuleResult {
  dependencyRule?: DependencyRule;
  userErrors: UserError[];
}

export interface DependencyRuleDeleteResult {
  deletedDependencyRuleId?: string;
  userErrors: UserError[];
}
```

### 5.2 Script Files

Create the following script files in `/services/catalog/src/scripts/bundle/`:

1. **BundleGroupCreateScript.ts** - Create bundle group
2. **BundleGroupUpdateScript.ts** - Update bundle group
3. **BundleGroupDeleteScript.ts** - Delete bundle group (cascades to items)
4. **BundleGroupReorderScript.ts** - Reorder groups by updating sortIndex
5. **BundleItemCreateScript.ts** - Create bundle item
6. **BundleItemUpdateScript.ts** - Update bundle item
7. **BundleItemDeleteScript.ts** - Delete bundle item
8. **BundleItemReorderScript.ts** - Reorder items within a group
9. **BundlePricingTemplateCreateScript.ts** - Create pricing template
10. **BundlePricingTemplateUpdateScript.ts** - Update pricing template
11. **BundlePricingTemplateDeleteScript.ts** - Delete pricing template
12. **DependencyRuleCreateScript.ts** - Create dependency rule with conditions and actions
13. **DependencyRuleUpdateScript.ts** - Update dependency rule (sync conditions/actions)
14. **DependencyRuleDeleteScript.ts** - Delete dependency rule (cascades)

### 5.3 Index Export

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

## Phase 6: Resolvers

### 6.1 Type Resolvers

**File:** `/services/catalog/src/resolvers/admin/BundleGroupResolver.ts`

Following `CollectionResolver.ts` pattern:

```typescript
export class BundleGroupResolver extends CatalogType<string, BundleGroup> {
  async $preload() {
    return await this.$ctx.loaders.bundleGroup.load(this.$props);
  }

  id() { return encodeGlobalIdByType(this.$props, GlobalIdEntity.BundleGroup); }
  async title() { return this.$get("title"); }
  async sortIndex() { return this.$get("sortIndex"); }
  async minSelection() { return this.$get("minSelection"); }
  async maxSelection() { return this.$get("maxSelection"); }
  async items() { /* load items via loader */ }
  async createdAt() { return this.$get("createdAt"); }
  async updatedAt() { return this.$get("updatedAt"); }
}
```

Similarly create:
- **BundleItemResolver.ts**
- **BundlePricingTemplateResolver.ts**
- **DependencyRuleResolver.ts**
- **ConditionGroupResolver.ts**
- **ConditionResolver.ts**
- **DependencyActionResolver.ts**
- **BundleResolver.ts** - Aggregate resolver for Bundle type

### 6.2 Update GlobalIdEntity

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

### 6.3 Update QueryResolver

**File:** `/services/catalog/src/resolvers/admin/QueryResolver.ts`

Add to `CatalogQueryResolver`:
```typescript
async bundle(args: { productId: string }) {
  const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
  if (!productId) return null;

  const groups = await this.$ctx.kernel.repository.bundleGroup.findByProductId(productId);
  if (groups.length === 0) return null;

  return new BundleResolver(productId, this.$ctx);
}

async bundlePricingTemplates(args: { productId: string }) {
  const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
  if (!productId) return [];

  const templates = await this.$ctx.kernel.repository.bundlePricingTemplate.findByProductId(productId);
  return templates.map(t => new BundlePricingTemplateResolver(t.id, this.$ctx));
}

async dependencyRules(args: { productId: string }) {
  const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
  if (!productId) return [];

  const rules = await this.$ctx.kernel.repository.dependencyRule.findByProductId(productId);
  return rules.map(r => new DependencyRuleResolver(r.id, this.$ctx));
}
```

### 6.4 Update MutationResolver

**File:** `/services/catalog/src/resolvers/admin/MutationResolver.ts`

Add imports for all bundle scripts and resolvers.

Add mutation methods:
```typescript
// ---- Bundle Group Mutations ----
async bundleGroupCreate(args: { input: BundleGroupCreateInput }) { ... }
async bundleGroupUpdate(args: { input: BundleGroupUpdateInput }) { ... }
async bundleGroupDelete(args: { input: BundleGroupDeleteInput }) { ... }
async bundleGroupReorder(args: { input: BundleGroupReorderInput }) { ... }

// ---- Bundle Item Mutations ----
async bundleItemCreate(args: { input: BundleItemCreateInput }) { ... }
async bundleItemUpdate(args: { input: BundleItemUpdateInput }) { ... }
async bundleItemDelete(args: { input: BundleItemDeleteInput }) { ... }
async bundleItemReorder(args: { input: BundleItemReorderInput }) { ... }

// ---- Pricing Template Mutations ----
async bundlePricingTemplateCreate(args: { input: BundlePricingTemplateCreateInput }) { ... }
async bundlePricingTemplateUpdate(args: { input: BundlePricingTemplateUpdateInput }) { ... }
async bundlePricingTemplateDelete(args: { input: BundlePricingTemplateDeleteInput }) { ... }

// ---- Dependency Rule Mutations ----
async dependencyRuleCreate(args: { input: DependencyRuleCreateInput }) { ... }
async dependencyRuleUpdate(args: { input: DependencyRuleUpdateInput }) { ... }
async dependencyRuleDelete(args: { input: DependencyRuleDeleteInput }) { ... }
```

---

## Phase 7: Codegen and Build

1. Run GraphQL codegen: `pnpm codegen`
2. Build packages: `pnpm build`
3. Run DB migration: `pnpm db:migrate`

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
| `src/loaders/BundleLoader.ts` | DataLoader for batching |
| `src/api/graphql-admin/schema/bundle.graphql` | GraphQL schema |
| `src/scripts/bundle/dto/index.ts` | Script DTOs |
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
| `packages/shared-graphql-guid/src/index.ts` | Add GlobalIdEntity values |
| `src/resolvers/admin/QueryResolver.ts` | Add bundle queries |
| `src/resolvers/admin/MutationResolver.ts` | Add bundle mutations |

---

## Validation Rules

### BundleGroup
- `title` is required, non-empty
- `minSelection` must be >= 0 if provided
- `maxSelection` must be >= minSelection if both provided
- `productId` must reference a valid product

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
- `name` is required, non-empty
- `priceType` must be valid BundlePriceType
- `priceValue` required for FIXED, DISCOUNT_PERCENT, DISCOUNT_FIXED
- `priceValue` must be null for BASE, FREE

### DependencyRule
- `name` is required, non-empty
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
