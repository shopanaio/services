# Architecture Decisions: Bundles Feature

## Overview

**Feature:** Implement Bundles functionality in catalog service - database schema, GraphQL API (queries and mutations) for bundle groups, bundle items, pricing templates, and dependency rules.

**Date:** 2026-02-10

---

## DECISIONS

**Service:** catalog

**Reason:** Bundles are product-centric functionality. The specification states "Bundle = Product" with direct FK to `inventory.product.id`. The catalog service already owns product management, collections, categories, and pricing (item_pricing table lives in catalog schema). The pricing service is stateless (calculation-only). All related entities (groups, items, templates, rules) belong in catalog.

**Pattern:** Script

**Reason:** All bundle operations are CRUD within a single database transaction. No post-commit side effects needed (no emails, no cross-service events). Similar to existing patterns: CollectionCreateScript, CategoryCreateScript, FacetGroupCreateScript.

**Authorization:** @Policy("bundle", "manage")

**Reason:** Single permission for all bundle management operations. Bundle configuration is admin-only functionality. Follows the pattern of other catalog resources.

---

## API Contract

### Queries
- `bundle(productId: ID!): Bundle` - Get bundle configuration for a product
- `bundlePricingTemplates(productId: ID!): [BundlePricingTemplate!]!` - List pricing templates for a product
- `dependencyRules(productId: ID!): [DependencyRule!]!` - List dependency rules for a product

### Mutations
- `bundleGroupCreate(input: BundleGroupCreateInput!): BundleGroupPayload!`
- `bundleGroupUpdate(input: BundleGroupUpdateInput!): BundleGroupPayload!`
- `bundleGroupDelete(input: BundleGroupDeleteInput!): BundleGroupDeletePayload!`
- `bundleGroupReorder(input: BundleGroupReorderInput!): BundleGroupReorderPayload!`
- `bundleItemCreate(input: BundleItemCreateInput!): BundleItemPayload!`
- `bundleItemUpdate(input: BundleItemUpdateInput!): BundleItemPayload!`
- `bundleItemDelete(input: BundleItemDeleteInput!): BundleItemDeletePayload!`
- `bundleItemReorder(input: BundleItemReorderInput!): BundleItemReorderPayload!`
- `bundlePricingTemplateCreate(input: BundlePricingTemplateCreateInput!): BundlePricingTemplatePayload!`
- `bundlePricingTemplateUpdate(input: BundlePricingTemplateUpdateInput!): BundlePricingTemplatePayload!`
- `bundlePricingTemplateDelete(input: BundlePricingTemplateDeleteInput!): BundlePricingTemplateDeletePayload!`
- `dependencyRuleCreate(input: DependencyRuleCreateInput!): DependencyRulePayload!`
- `dependencyRuleUpdate(input: DependencyRuleUpdateInput!): DependencyRulePayload!`
- `dependencyRuleDelete(input: DependencyRuleDeleteInput!): DependencyRuleDeletePayload!`

---

## Data Changes

**New Tables (in catalog schema):**
- `bundle_group` - Groups within a bundle product
- `bundle_item` - Items in a group (refs to products/variants)
- `bundle_pricing_template` - Reusable pricing templates
- `dependency_rule` - Conditional behavior rules
- `condition_group` - Groups of conditions (AND/OR)
- `condition` - Individual conditions
- `dependency_action` - Actions triggered by rules

**New Enums:**
- `bundle_item_type` (PRODUCT, VARIANT)
- `bundle_price_type` (BASE, FIXED, DISCOUNT_PERCENT, DISCOUNT_FIXED, FREE)
- `logic_operator` (AND, OR)
- `condition_category` (STATE_CHECK, NUMERIC)
- `condition_subject` (ITEM_SELECTED, ITEM_QTY, GROUP_TOTAL_QTY)
- `dependency_target_type` (ITEM, GROUP, BUNDLE)
- `dependency_action_type` (SHOW, HIDE, SET_REQUIRED, ADJUST_PRICE)

---

## Reference Patterns

| Component | Reference File |
|-----------|----------------|
| DB Schema | `services/catalog/src/repositories/models/collection.ts` |
| Repository | `services/catalog/src/repositories/collection/CollectionRepository.ts` |
| Script | `services/catalog/src/scripts/collection/CollectionCreateScript.ts` |
| GraphQL Schema | `services/catalog/src/api/graphql-admin/schema/collection.graphql` |
| Resolver | `services/catalog/src/resolvers/admin/MutationResolver.ts` |
| Repository Aggregator | `services/catalog/src/repositories/Repository.ts` |

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema | `catalog` (not `pricing`) | Pricing service is stateless; catalog owns product data including item_pricing |
| Bundle entity | No separate bundle table | Bundle = Product; all tables reference `inventory.product.id` |
| Cross-schema FK | Logical FK only | No actual FK constraint to inventory.product; validated at app level |
| Sort ordering | `sort_index` integer | Matches existing pattern in collection, facet, etc. |
| Money values | Integer (cents) | Matches existing `item_pricing.amount_minor` pattern |
| JSONB usage | `excluded_variant_ids` only | Avoids join table for rarely-used feature |
| Condition structure | Nested tables | `dependency_rule` -> `condition_group` -> `condition` for AND/OR logic |
| Action stacking | `stackable` boolean | Controls whether effects accumulate or replace |
