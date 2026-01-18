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
    // Composite index for efficient children queries:
    // WHERE product_id = ? AND parent_id = ? ORDER BY sort_index
    index("product_feature_children_idx")
      .on(table.productId, table.parentId, table.sortIndex),
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

-- Composite index for efficient children queries:
-- WHERE product_id = ? AND parent_id = ? ORDER BY sort_index
CREATE INDEX product_feature_children_idx
  ON product_feature(product_id, parent_id, sort_index);

-- Backfill existing features as attributes (is_group = false, already default)
-- Backfill sort_index based on id to ensure deterministic ordering
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY id) - 1 as new_sort_index
  FROM product_feature
)
UPDATE product_feature
SET sort_index = ranked.new_sort_index
FROM ranked
WHERE product_feature.id = ranked.id;
```

### Constraints

```sql
-- Ensure only attributes can have values (enforced in application layer)
-- Ensure groups cannot have parent (only one level of nesting)
-- CHECK constraint for single-level hierarchy:
ALTER TABLE product_feature
  ADD CONSTRAINT feature_group_no_parent
  CHECK (is_group = false OR parent_id IS NULL);

-- Ensure sortIndex is unique within each "container" to prevent unstable ordering
-- Root-level features: unique (product_id, sort_index) where parent_id IS NULL
CREATE UNIQUE INDEX product_feature_root_sort_idx
  ON product_feature(product_id, sort_index)
  WHERE parent_id IS NULL;

-- Child features: unique (parent_id, sort_index) where parent_id IS NOT NULL
CREATE UNIQUE INDEX product_feature_child_sort_idx
  ON product_feature(parent_id, sort_index)
  WHERE parent_id IS NOT NULL;
```

> **Why partial unique indexes for sortIndex?**
> Without these constraints, duplicate sortIndex values within the same container
> lead to unstable ordering (non-deterministic query results). These indexes
> catch frontend bugs early and ensure consistent UI behavior.

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
  """Child features. Returns empty array for attributes (isGroup = false)."""
  children: [ProductFeature!]!
  """Values. Returns empty array for groups (isGroup = true)."""
  values: [ProductFeatureValue!]!
}

type Product implements Node {
  # ... existing fields ...

  """
  All features (flat list, includes both groups and attributes).
  @deprecated Use rootFeatures for tree structure.
  """
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

  """
  Temporary client-side ID for new features (frontend generates, e.g., UUID).
  Used to reference this item as a parent before it has a real ID.
  Only needed for new items that will be referenced by other new items.
  """
  clientId: String

  """Whether this is a group (true) or attribute (false). Default: false."""
  isGroup: Boolean

  """
  Parent reference for tree structure:
  - parentId: ID of an existing group (use for existing parents)
  - parentClientId: clientId of a new group in the same request (use for new parents)
  - Both null: root-level feature
  """
  parentId: ID
  parentClientId: String

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
   - clientIdMap: Map<String, ID> (for resolving clientId → real ID)

3. Determine operations:
   - TO_DELETE = existingById.keys() - inputById.keys()
   - TO_UPDATE = existingById.keys() ∩ inputById.keys()
   - TO_CREATE = newItems

4. Validate:
   - Slugs unique within product
   - Groups cannot have values
   - Attributes cannot have children
   - parentId/parentClientId references valid groups
   - isGroup cannot change for existing features
   - No cycles in parent references

5. Execute in order (IMPORTANT: UPDATE/CREATE before DELETE to prevent CASCADE issues):
   a. UPDATE features in TO_UPDATE (including parentId changes for moves)
   b. CREATE features in TO_CREATE:
      - First pass: create all items (parentId = null temporarily for new parents)
      - Build clientIdMap: clientId → generated real ID
      - Second pass: resolve parentClientId → real parentId using clientIdMap
   c. Sync values for each attribute (same create/update/delete logic)
   d. DELETE features in TO_DELETE (CASCADE deletes children & values)
      - Safe now because all moves have been processed

6. Return all features with final IDs
```

> **Why UPDATE/CREATE before DELETE?**
> If an attribute is moved from Group A to Group B, and Group A is being deleted,
> executing DELETE first would CASCADE-delete the attribute before we can update its parentId.
> By processing moves first, we ensure the attribute is safely re-parented before the old group is removed.

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

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **isGroup immutable** | Cannot change `isGroup` after creation | App layer (sync script) |
| **Groups have no values** | Features with `isGroup = true` cannot have values | App layer |
| **Attributes have no children** | Features with `isGroup = false` cannot have children | App layer |
| **Single-level nesting** | Groups cannot have a parent (groups are always root-level) | DB constraint + App layer |
| **Valid parent reference** | `parentId` must reference a feature with `isGroup = true` in the same product | App layer (DB can't cross-check) |
| **Same product constraint** | Parent must belong to the same `productId` as the child | App layer |
| **Unique slug** | Slug must be unique within the product (both groups and attributes share namespace) | DB unique index |
| **No orphan clientId refs** | `parentClientId` must reference an existing `clientId` in the same request | App layer |

### Validation Notes

> **Why app-layer validation for parent reference?**
> SQL CHECK constraints cannot reference other rows. The constraint `CHECK (is_group = false OR parent_id IS NULL)`
> only ensures groups have no parent, but cannot verify that `parentId` points to a valid group.
> This must be validated in the application layer before insert/update.

> **Cycle protection:**
> With single-level nesting (groups always at root), cycles are structurally impossible.
> However, if the model evolves to support deeper nesting, cycle detection will be required.

### Parent Reference Validation (App Layer)

When `parentId` or `parentClientId` is provided, validate ALL of the following:

```typescript
// Pseudo-code for parent validation
function validateParent(parent: ProductFeature | null, child: InputItem): ValidationError[] {
  if (!parent) {
    return [{ field: "parentId", message: "Parent not found" }];
  }

  const errors: ValidationError[] = [];

  // 1. Parent must be a group
  if (!parent.isGroup) {
    errors.push({
      field: "parentId",
      message: "Parent must be a group (isGroup = true)",
    });
  }

  // 2. Parent must be at root level (no nested groups)
  if (parent.parentId !== null) {
    errors.push({
      field: "parentId",
      message: "Parent group must be at root level",
    });
  }

  // 3. Parent must belong to the same product
  if (parent.productId !== child.productId) {
    errors.push({
      field: "parentId",
      message: "Parent must belong to the same product",
    });
  }

  return errors;
}
```

This validation ensures:
- Attributes cannot be parents (only groups can have children)
- Groups cannot be nested (single-level hierarchy enforced)
- Cross-product references are rejected

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
        # Group (new - no id, has clientId for referencing)
        {
          clientId: "temp-group-1"  # frontend-generated temp ID
          isGroup: true
          slug: "physical-properties"
          name: "Physical Properties"
          sortIndex: 0
        }
        # Attribute in group (new - references group by clientId)
        {
          slug: "material"
          name: "Material"
          parentClientId: "temp-group-1"  # references the new group above
          sortIndex: 0
          values: [
            { slug: "cotton", name: "Cotton" }
            { slug: "wool", name: "Wool" }
          ]
        }
        # Existing attribute moved to new group (has id, uses parentClientId)
        {
          id: "existing-feat-456"
          slug: "color"
          name: "Color"
          parentClientId: "temp-group-1"  # moved into new group
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

### Resolver Behavior
- `children` always returns `[]` for attributes (`isGroup = false`) - schema is predictable
- `values` always returns `[]` for groups (`isGroup = true`)
- `features` (flat list) is deprecated in favor of `rootFeatures` for tree structure

### DataLoader Implementation
For efficient loading of `children`:
```typescript
// Load children by batching (productId, parentId) pairs
const childrenLoader = new DataLoader<string, ProductFeature[]>(
  async (parentIds) => {
    const children = await db.query.productFeature.findMany({
      where: inArray(productFeature.parentId, parentIds),
      orderBy: [asc(productFeature.sortIndex)],
    });
    // Group by parentId and return in order
    return parentIds.map(parentId =>
      children.filter(c => c.parentId === parentId)
    );
  }
);
```
