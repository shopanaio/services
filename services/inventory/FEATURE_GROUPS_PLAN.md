# Feature Groups Implementation Plan

This document outlines the implementation plan for adding feature (attribute) groups support to the Inventory Service using a **unified entity approach**.

## Overview

### Current Structure

```
Product
└── Features[] (flat list)
    └── Values[]
```

### Target Structure (Unified Entity)

```
Product
└── Features[] (recursive tree structure)
    ├── Feature (isGroup: true, parentId: null)
    │   └── Feature (isGroup: false, parentId: groupId)
    │       └── Values[]
    ├── Feature (isGroup: false, parentId: null)  # root-level attribute
    │   └── Values[]
    └── ...
```

**Key Concept:** A `ProductFeature` can be either:
- **Group** (`isGroup: true`) - A container for other features (no values)
- **Attribute** (`isGroup: false`) - A leaf node with values

---

## 1. Database Schema Changes (Drizzle ORM)

### Modified `product_feature` Table

```typescript
// services/inventory/src/repositories/models/features.ts

export const productFeature = pgTable(
  "product_feature",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),

    // NEW COLUMNS:
    isGroup: boolean("is_group").notNull().default(false),
    parentId: uuid("parent_id")
      .references((): AnyPgColumn => productFeature.id, { onDelete: "cascade" }),
    sortIndex: integer("sort_index").notNull().default(0),

    // Existing:
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("product_feature_product_slug_idx")
      .on(table.productId, table.slug),
    index("product_feature_product_id_idx")
      .on(table.productId),
    index("product_feature_parent_id_idx")  // NEW
      .on(table.parentId),
  ]
);
```

### Migration SQL

```sql
-- Modify features table
ALTER TABLE product_feature
  ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN parent_id UUID REFERENCES product_feature(id) ON DELETE CASCADE,
  ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX product_feature_parent_id_idx ON product_feature(parent_id);

-- Backfill existing features as attributes (is_group = false, already default)
```

### Constraints

```sql
-- Ensure only attributes can have values (enforced in application layer)
-- Ensure groups cannot have parent (only one level of nesting)
-- CHECK constraint for single-level hierarchy:
ALTER TABLE product_feature
  ADD CONSTRAINT feature_group_no_parent
  CHECK (is_group = false OR parent_id IS NULL);
```

---

## 2. GraphQL API Changes

### Modified Types

```graphql
"""A product feature represents either a group or an attribute."""
type ProductFeature implements Node {
  """The globally unique ID of the feature."""
  id: ID!
  """Whether this feature is a group (container) or an attribute (leaf)."""
  isGroup: Boolean!
  """The URL-friendly identifier."""
  slug: String!
  """Display name."""
  name: String!
  """Sort order within parent (or at root level)."""
  sortIndex: Int!
  """Parent group, if this feature belongs to a group."""
  parent: ProductFeature
  """Child features (only when isGroup = true)."""
  children: [ProductFeature!]!
  """Values (only when isGroup = false, empty for groups)."""
  values: [ProductFeatureValue!]!
}

type Product implements Node {
  # ... existing fields ...

  """All features (flat list)."""
  features: [ProductFeature!]!

  """Root-level features only (groups and ungrouped attributes)."""
  rootFeatures: [ProductFeature!]!
}
```

### Modified Mutations

```graphql
# === CREATE FEATURE ===
input ProductFeatureCreateInput {
  """The ID of the product."""
  productId: ID!
  """Whether to create a group (true) or attribute (false). Default: false."""
  isGroup: Boolean
  """Parent group ID (optional, null = root level)."""
  parentId: ID
  """The URL-friendly slug."""
  slug: String!
  """Display name."""
  name: String!
  """Values (only when isGroup = false)."""
  values: [ProductFeatureValueCreateInput!]
}

type ProductFeatureCreatePayload {
  product: Product
  feature: ProductFeature
  userErrors: [GenericUserError!]!
}

# === UPDATE FEATURE ===
input ProductFeatureUpdateInput {
  """The ID of the feature to update."""
  id: ID!
  """Move to different parent (null = root level)."""
  parentId: ID
  """New slug."""
  slug: String
  """Display name."""
  name: String
  """New sort order."""
  sortIndex: Int
  """Nested value operations (only when isGroup = false)."""
  values: ProductFeatureValuesInput
}

type ProductFeatureUpdatePayload {
  product: Product
  feature: ProductFeature
  userErrors: [GenericUserError!]!
}

# === DELETE FEATURE ===
input ProductFeatureDeleteInput {
  """The ID of the feature to delete."""
  id: ID!
}

type ProductFeatureDeletePayload {
  product: Product
  deletedFeatureId: ID
  userErrors: [GenericUserError!]!
}

# === REORDER FEATURES ===
input ProductFeatureReorderInput {
  """The ID of the product."""
  productId: ID!
  """Parent ID (null = reorder root-level features)."""
  parentId: ID
  """Ordered list of feature IDs. Position = new sortIndex."""
  featureIds: [ID!]!
}

type ProductFeatureReorderPayload {
  product: Product
  userErrors: [GenericUserError!]!
}
```

---

## 3. File Structure

```
services/inventory/src/
├── repositories/
│   └── models/
│       └── features.ts                # MODIFY: add isGroup, parentId, sortIndex
│
├── api/graphql-admin/schema/
│   └── features.graphql               # MODIFY: add new fields, mutations
│
├── resolvers/admin/
│   ├── FeatureResolver.ts             # MODIFY: add isGroup, parent, children
│   ├── ProductResolver.ts             # MODIFY: add rootFeatures
│   └── MutationResolver.ts            # MODIFY: add reorder mutation
│
├── scripts/feature/
│   ├── FeatureCreateScript.ts         # MODIFY: support isGroup, parentId
│   ├── FeatureUpdateScript.ts         # MODIFY: parentId, sortIndex
│   ├── FeatureDeleteScript.ts         # MODIFY: cascade children handling
│   └── FeatureReorderScript.ts        # NEW
│
└── loaders/
    └── FeatureLoader.ts               # MODIFY: add children loader
```

---

## 4. Validation Rules

| Rule | Description |
|------|-------------|
| **isGroup immutable** | Cannot change `isGroup` after creation |
| **Groups have no values** | Features with `isGroup = true` cannot have values |
| **Attributes have no children** | Features with `isGroup = false` cannot have children |
| **Single-level nesting** | Groups cannot have a parent (groups are always root-level) |
| **Valid parent** | `parentId` must reference a group (`isGroup = true`) in the same product |
| **Unique slug** | Slug must be unique within the product |

---

## 5. API Usage Examples

### Create a Group

```graphql
mutation {
  inventoryMutation {
    productFeatureCreate(input: {
      productId: "prod-123"
      isGroup: true
      slug: "physical-properties"
      name: "Physical Properties"
    }) {
      feature { id isGroup name }
      userErrors { field message }
    }
  }
}
```

### Create an Attribute in a Group

```graphql
mutation {
  inventoryMutation {
    productFeatureCreate(input: {
      productId: "prod-123"
      parentId: "group-456"
      slug: "material"
      name: "Material"
      values: [
        { slug: "cotton", name: "Cotton" }
        { slug: "wool", name: "Wool" }
      ]
    }) {
      feature {
        id
        isGroup
        name
        parent { name }
        values { name }
      }
    }
  }
}
```

### Create a Root-Level Attribute (no group)

```graphql
mutation {
  inventoryMutation {
    productFeatureCreate(input: {
      productId: "prod-123"
      slug: "sku"
      name: "SKU"
      values: []
    }) {
      feature { id isGroup name parent }
    }
  }
}
```

### Move Attribute to Different Group

```graphql
mutation {
  inventoryMutation {
    productFeatureUpdate(input: {
      id: "feature-789"
      parentId: "group-new"  # or null for root level
    }) {
      feature {
        id
        parent { name }
      }
    }
  }
}
```

### Query Product Features (Tree Structure)

```graphql
query {
  product(id: "prod-123") {
    # Flat list of all features
    features {
      id
      isGroup
      name
      sortIndex
      parent { id }
    }

    # Tree structure (root level only)
    rootFeatures {
      id
      isGroup
      name
      sortIndex
      children {          # Only when isGroup = true
        id
        isGroup
        name
        sortIndex
        values { name }   # Only when isGroup = false
      }
      values { name }     # For root-level attributes
    }
  }
}
```

### Reorder Features Within a Group

```graphql
mutation {
  inventoryMutation {
    productFeatureReorder(input: {
      productId: "prod-123"
      parentId: "group-456"  # or null for root level
      featureIds: ["feat-3", "feat-1", "feat-2"]
    }) {
      product {
        rootFeatures { id sortIndex }
      }
    }
  }
}
```

---

## 6. Implementation Summary

| Component | Change |
|-----------|--------|
| **DB Columns** | +3 columns in `product_feature` (`is_group`, `parent_id`, `sort_index`) |
| **DB Constraint** | +1 CHECK constraint (groups cannot have parent) |
| **GraphQL Fields** | +5 fields (`isGroup`, `sortIndex`, `parent`, `children`, `rootFeatures`) |
| **GraphQL Mutations** | +1 new mutation (`productFeatureReorder`) |
| **Scripts** | +1 new, 3 modified |
| **Loaders** | Modified to support children loading |

---

## 7. Data Model Comparison

### Before (Flat)
```
ProductFeature {
  id, productId, slug, name
  values: ProductFeatureValue[]
}
```

### After (Tree)
```
ProductFeature {
  id, productId, slug, name
  isGroup: boolean
  parentId: ID | null
  sortIndex: number
  parent: ProductFeature | null
  children: ProductFeature[]      # only if isGroup = true
  values: ProductFeatureValue[]   # only if isGroup = false
}
```

---

## 8. Behavior Notes

### Group Deletion
When a group is deleted, all child features (attributes) are also deleted via CASCADE. This matches the UI behavior where deleting a group removes all its contents.

### Feature Movement
- Attributes can be moved between groups or to/from root level
- Groups are always at root level and cannot be moved into other groups
- When moved, `sortIndex` is recalculated based on target location

### Sort Index Management
- Root-level items (groups and root attributes) share the same `sortIndex` sequence
- Child attributes within a group have their own `sortIndex` sequence starting from 0
