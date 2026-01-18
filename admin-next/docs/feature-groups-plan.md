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

### Sync Mutation (Single Transaction)

Instead of separate CRUD mutations, use a single **sync** approach:
- Frontend sends the **complete list** of product features
- Backend **in a single transaction** compares with DB and performs create/update/delete

```graphql
# === SYNC ALL FEATURES ===
input ProductFeaturesSyncInput {
  """The ID of the product."""
  productId: ID!
  """Complete list of features (replaces all existing features)."""
  features: [ProductFeatureSyncItemInput!]!
}

input ProductFeatureSyncItemInput {
  """
  Feature ID for existing features.
  - If provided: update existing feature
  - If null/omitted: create new feature (backend generates ID)
  Features in DB but not in this list will be DELETED.
  """
  id: ID

  """Whether this is a group (true) or attribute (false). Default: false."""
  isGroup: Boolean

  """
  Parent reference for tree structure.
  - For new items: index in the features array (0-based) pointing to parent group
  - For existing items: ID of parent group, or null for root level
  Use `parentIndex` for new items to reference other new items in same request.
  """
  parentId: ID
  parentIndex: Int

  """The URL-friendly slug."""
  slug: String!

  """Display name."""
  name: String!

  """Sort order (position in the list determines sortIndex if omitted)."""
  sortIndex: Int

  """Values for this feature (only when isGroup = false)."""
  values: [ProductFeatureValueSyncInput!]
}

input ProductFeatureValueSyncInput {
  """Value ID for existing values. Null = create new."""
  id: ID
  """The URL-friendly slug."""
  slug: String!
  """Display name."""
  name: String!
  """Sort order."""
  sortIndex: Int
}

type ProductFeaturesSyncPayload {
  """The updated product."""
  product: Product
  """List of all synced features with their final IDs."""
  features: [ProductFeature!]!
  """Any validation errors."""
  userErrors: [GenericUserError!]!
}

extend type InventoryMutation {
  """
  Sync all features for a product in a single transaction.
  - Creates new features (items without id)
  - Updates existing features (items with id)
  - Deletes removed features (existing features not in the list)
  """
  productFeaturesSync(input: ProductFeaturesSyncInput!): ProductFeaturesSyncPayload!
}
```

### Sync Algorithm (Backend Logic)

```
Transaction:
1. Fetch all existing features for productId
2. Build maps:
   - existingById: Map<ID, Feature>
   - inputById: Map<ID, InputItem> (items with id)
   - newItems: InputItem[] (items without id)

3. Determine operations:
   - TO_DELETE = existingById.keys() - inputById.keys()
   - TO_UPDATE = existingById.keys() ∩ inputById.keys()
   - TO_CREATE = newItems

4. Validate:
   - Slugs unique within product
   - Groups cannot have values
   - Attributes cannot have children
   - parentId/parentIndex references valid groups

5. Execute in order:
   a. DELETE features in TO_DELETE (CASCADE deletes children & values)
   b. UPDATE features in TO_UPDATE
   c. CREATE features in TO_CREATE (resolve parentIndex → real parentId)
   d. Sync values for each attribute (same create/update/delete logic)

6. Return all features with final IDs
```

### Alternative: Separate Mutations (for granular operations)

If granular operations are needed alongside sync:

```graphql
# Keep these for specific use cases (e.g., quick single-item operations)
productFeatureCreate(input: ProductFeatureCreateInput!): ProductFeatureCreatePayload!
productFeatureUpdate(input: ProductFeatureUpdateInput!): ProductFeatureUpdatePayload!
productFeatureDelete(input: ProductFeatureDeleteInput!): ProductFeatureDeletePayload!
```
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
│   └── features.graphql               # MODIFY: add new fields, sync mutation
│
├── resolvers/admin/
│   ├── FeatureResolver.ts             # MODIFY: add isGroup, parent, children
│   ├── ProductResolver.ts             # MODIFY: add rootFeatures
│   └── MutationResolver.ts            # MODIFY: add productFeaturesSync
│
├── scripts/feature/
│   └── FeaturesSyncScript.ts          # NEW: single script for sync operation
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

### Sync Features (Full Example)

Frontend sends the **complete list** of features. Backend creates/updates/deletes in a single transaction.

```graphql
mutation {
  inventoryMutation {
    productFeaturesSync(input: {
      productId: "prod-123"
      features: [
        # Group (new - no id)
        {
          isGroup: true
          slug: "physical-properties"
          name: "Physical Properties"
          sortIndex: 0
        }
        # Attribute in group (new - references group by index)
        {
          slug: "material"
          name: "Material"
          parentIndex: 0  # references first item (the group above)
          sortIndex: 0
          values: [
            { slug: "cotton", name: "Cotton" }
            { slug: "wool", name: "Wool" }
          ]
        }
        # Existing attribute (update - has id)
        {
          id: "existing-feat-456"
          slug: "color"
          name: "Color"
          parentIndex: 0
          sortIndex: 1
          values: [
            { id: "existing-val-1", slug: "red", name: "Red" }
            { slug: "blue", name: "Blue" }  # new value
            # "green" value was removed - will be deleted
          ]
        }
        # Root-level attribute (no parent)
        {
          slug: "sku"
          name: "SKU"
          sortIndex: 1
          values: []
        }
      ]
    }) {
      features {
        id        # includes newly generated IDs
        isGroup
        name
        parent { id }
        values { id name }
      }
      userErrors { field message }
    }
  }
}
```

### Sync - Update Existing Features

If features already exist, pass their `id` to update them:

```graphql
mutation {
  inventoryMutation {
    productFeaturesSync(input: {
      productId: "prod-123"
      features: [
        {
          id: "group-123"        # existing group
          isGroup: true
          slug: "dimensions"     # rename slug
          name: "Dimensions"
          sortIndex: 0
        }
        {
          id: "feat-456"         # existing attribute
          slug: "width"
          name: "Width (cm)"     # update name
          parentId: "group-123"  # use parentId for existing items
          sortIndex: 0
        }
        # feat-789 was in DB but not in list → will be DELETED
      ]
    }) {
      features { id name }
      userErrors { field message }
    }
  }
}
```

### Sync - Move Attribute Between Groups

```graphql
mutation {
  inventoryMutation {
    productFeaturesSync(input: {
      productId: "prod-123"
      features: [
        { id: "group-A", isGroup: true, slug: "group-a", name: "Group A", sortIndex: 0 }
        { id: "group-B", isGroup: true, slug: "group-b", name: "Group B", sortIndex: 1 }
        {
          id: "feat-123"
          slug: "material"
          name: "Material"
          parentId: "group-B"    # moved from group-A to group-B
          sortIndex: 0
          values: [{ id: "v1", slug: "cotton", name: "Cotton" }]
        }
      ]
    }) {
      features { id parent { id name } }
    }
  }
}
```

### Sync - Reorder Features

Array order determines `sortIndex` (if not explicitly provided):

```graphql
mutation {
  inventoryMutation {
    productFeaturesSync(input: {
      productId: "prod-123"
      features: [
        # New order: feat-3, feat-1, feat-2
        { id: "feat-3", slug: "third", name: "Now First" }
        { id: "feat-1", slug: "first", name: "Now Second" }
        { id: "feat-2", slug: "second", name: "Now Third" }
      ]
    }) {
      features { id sortIndex }
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

---

## 6. Implementation Summary

| Component | Change |
|-----------|--------|
| **DB Columns** | +3 columns in `product_feature` (`is_group`, `parent_id`, `sort_index`) |
| **DB Constraint** | +1 CHECK constraint (groups cannot have parent) |
| **GraphQL Fields** | +5 fields (`isGroup`, `sortIndex`, `parent`, `children`, `rootFeatures`) |
| **GraphQL Mutations** | +1 new mutation (`productFeaturesSync`) - replaces separate CRUD |
| **Scripts** | +1 new (`FeaturesSyncScript.ts`) |
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
