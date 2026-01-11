# Product SEO Fields Implementation Plan

This document outlines the implementation plan for adding Open Graph metadata fields to the Product entity in the Inventory Service.

## Overview

### Current State

**Database (`product_translation` table):**
```
productId, locale, title, descriptionText, descriptionHtml, descriptionJson, excerpt, seoTitle, seoDescription
```

SEO fields (`seoTitle`, `seoDescription`) exist in `productTranslation` but should be moved to a dedicated SEO table.

**Missing:** Open Graph fields for social media sharing.

### Target State

**UI Requirements** (from `seo-block.tsx`):
```typescript
interface ISeoPreviewData {
  seoTitle?: string | null;       // Move to product_seo
  seoDescription?: string | null; // Move to product_seo
  ogTitle?: string | null;        // Add to product_seo
  ogDescription?: string | null;  // Add to product_seo
  ogImage?: IMediaFile | null;    // Add to product_seo
}
```

**All SEO fields will be in a new `product_seo` table with locale support.**

---

## 1. Database Schema Changes (Drizzle ORM)

### New `product_seo` Table

A dedicated SEO table with all SEO and Open Graph fields, with locale support.

```typescript
// services/inventory/src/repositories/models/seo.ts

import {
  uuid,
  varchar,
  text,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { product } from "./products";

export const productSeo = inventorySchema.table(
  "product_seo",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    // SEO fields (for search engines)
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 160 }),

    // Open Graph fields (for social media)
    ogTitle: varchar("og_title", { length: 95 }),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id"),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    index("idx_product_seo_project").on(table.projectId),
    index("idx_product_seo_project_locale").on(table.projectId, table.locale),
  ]
);

export type ProductSeo = typeof productSeo.$inferSelect;
export type NewProductSeo = typeof productSeo.$inferInsert;
```

### Column Specifications

| Column | Type | Max Length | Notes |
|--------|------|------------|-------|
| `seo_title` | VARCHAR(70) | 70 chars | Google truncates at ~60 chars |
| `seo_description` | VARCHAR(160) | 160 chars | Google truncates at ~155 chars |
| `og_title` | VARCHAR(95) | 95 chars | Facebook recommends 40-60, max 95 |
| `og_description` | TEXT | - | Facebook recommends up to 200 chars |
| `og_image_id` | UUID | - | References Media service File entity, per-locale |

### Migration SQL

```sql
-- Create product_seo table
CREATE TABLE inventory.product_seo (
  project_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES inventory.product(id) ON DELETE CASCADE,
  locale VARCHAR(8) NOT NULL,

  -- SEO fields
  seo_title VARCHAR(70),
  seo_description VARCHAR(160),

  -- Open Graph fields
  og_title VARCHAR(95),
  og_description TEXT,
  og_image_id UUID,

  PRIMARY KEY (product_id, locale)
);

CREATE INDEX idx_product_seo_project ON inventory.product_seo(project_id);
CREATE INDEX idx_product_seo_project_locale ON inventory.product_seo(project_id, locale);

-- Migrate existing SEO data from product_translation
INSERT INTO inventory.product_seo (project_id, product_id, locale, seo_title, seo_description)
SELECT project_id, product_id, locale, seo_title, seo_description
FROM inventory.product_translation
WHERE seo_title IS NOT NULL OR seo_description IS NOT NULL;

-- Remove SEO columns from product_translation (optional, after migration verified)
-- ALTER TABLE inventory.product_translation DROP COLUMN seo_title;
-- ALTER TABLE inventory.product_translation DROP COLUMN seo_description;
```

### Export from models/index.ts

```typescript
// Add to services/inventory/src/repositories/models/index.ts
export * from "./seo";
```

---

## 2. GraphQL API Changes

### New ProductSeo Type

```graphql
# services/inventory/src/api/graphql-admin/schema/seo.graphql

"""
SEO and Open Graph metadata for a product.
"""
type ProductSeo {
  """SEO title for search engines (max 70 chars)."""
  seoTitle: String

  """SEO description for search engines (max 160 chars)."""
  seoDescription: String

  """Open Graph title for social media sharing (max 95 chars)."""
  ogTitle: String

  """Open Graph description for social media sharing."""
  ogDescription: String

  """Open Graph image for social media sharing."""
  ogImage: File
}

"""
Input for updating product SEO data.
"""
input ProductSeoInput {
  """SEO title (max 70 chars)."""
  seoTitle: String

  """SEO description (max 160 chars)."""
  seoDescription: String

  """Open Graph title (max 95 chars)."""
  ogTitle: String

  """Open Graph description."""
  ogDescription: String

  """Open Graph image file ID."""
  ogImageId: ID
}
```

### Modified Product Type

```graphql
# services/inventory/src/api/graphql-admin/schema/product.graphql

type Product implements Node @key(fields: "id") {
  # ... existing fields ...

  # REMOVE these (moved to ProductSeo):
  # seoTitle: String
  # seoDescription: String

  # NEW:

  """SEO and Open Graph metadata."""
  seo: ProductSeo
}
```

### Modified ProductUpdateInput

```graphql
input ProductUpdateInput {
  """The product ID."""
  id: ID!

  # ... existing fields ...

  # REMOVE these (moved to ProductSeoInput):
  # seoTitle: String
  # seoDescription: String

  # NEW:

  """SEO and Open Graph metadata."""
  seo: ProductSeoInput
}
```

---

## 3. File Structure

```
services/inventory/src/
├── repositories/
│   └── models/
│       ├── index.ts                 # MODIFY: export seo
│       └── seo.ts                   # NEW: product_seo table
│
├── api/graphql-admin/schema/
│   ├── product.graphql              # MODIFY: add seo field
│   └── seo.graphql                  # NEW: ProductSeo type
│
├── resolvers/admin/
│   ├── ProductResolver.ts           # MODIFY: add seo resolver
│   └── ProductSeoResolver.ts        # NEW: resolve ogImage
│
├── loaders/
│   └── ProductSeoLoader.ts          # NEW: batch load seo by productId+locale
│
└── scripts/product/
    └── ProductUpdateScript.ts       # MODIFY: handle seo input
```

---

## 4. Resolver Implementation

### ProductResolver.ts

```typescript
@ResolveField(() => ProductSeo, { nullable: true })
async seo(
  @Parent() product: Product,
  @Context() ctx: GraphQLContext
): Promise<ProductSeo | null> {
  const locale = ctx.locale; // From context
  return ctx.loaders.productSeo.load({ productId: product.id, locale });
}
```

### ProductSeoResolver.ts

```typescript
@Resolver(() => ProductSeo)
export class ProductSeoResolver {
  @ResolveField(() => File, { nullable: true })
  async ogImage(@Parent() seo: ProductSeo): Promise<{ __typename: string; id: string } | null> {
    if (!seo.ogImageId) return null;
    return { __typename: 'File', id: seo.ogImageId };
  }
}
```

---

## 5. Data Model Summary

### Before (SEO in Translation)

```
productTranslation:
  productId, locale, title, description*, excerpt, seoTitle, seoDescription
```

### After (SEO in Separate Table)

```
productTranslation:
  productId, locale, title, description*, excerpt
  # seoTitle, seoDescription - REMOVED

productSeo:
  productId, locale, seoTitle, seoDescription, ogTitle, ogDescription, ogImageId
```

### Why Separate Table?

| Reason | Explanation |
|--------|-------------|
| **Separation of concerns** | Translation = content, SEO = metadata |
| **Optional data** | SEO/OG fields are often empty, separate table avoids NULLs |
| **Different update patterns** | SEO often updated independently from content |
| **Per-locale OG images** | Different images for different markets/languages |
| **All SEO in one place** | Easier to manage all SEO fields together |

---

## 6. Validation Rules

| Field | Validation |
|-------|------------|
| `seoTitle` | Max 70 characters |
| `seoDescription` | Max 160 characters |
| `ogTitle` | Max 95 characters |
| `ogDescription` | Recommended max 200 characters |
| `ogImageId` | Must be valid UUID (if provided) |

---

## 7. Implementation Summary

| Component | Change |
|-----------|--------|
| **New Table** | `product_seo` (productId, locale, seoTitle, seoDescription, ogTitle, ogDescription, ogImageId) |
| **Remove Columns** | `seo_title`, `seo_description` from `product_translation` |
| **GraphQL Types** | +1 new type `ProductSeo` |
| **GraphQL Fields** | +1 new field `seo` on Product, -2 fields (`seoTitle`, `seoDescription`) |
| **GraphQL Inputs** | +1 new input `ProductSeoInput` |
| **Resolvers** | +1 new `ProductSeoResolver`, +1 field resolver on Product |
| **Loaders** | +1 new `ProductSeoLoader` |
| **Scripts** | Modified `ProductUpdateScript` |

---

## 8. API Usage Example

### Update Product SEO

```graphql
mutation {
  inventoryMutation {
    productUpdate(input: {
      id: "prod-123"
      seo: {
        seoTitle: "Premium Cotton T-Shirt | ShopName"
        seoDescription: "High-quality 100% cotton t-shirt."
        ogTitle: "Premium Cotton T-Shirt"
        ogDescription: "Discover our best-selling cotton t-shirt."
        ogImageId: "file-456"
      }
    }) {
      product {
        id
        seo {
          seoTitle
          seoDescription
          ogTitle
          ogDescription
          ogImage { id url }
        }
      }
      userErrors { field message }
    }
  }
}
```

### Query Product SEO

```graphql
query {
  product(id: "prod-123") {
    id
    title
    handle

    # All SEO fields (from product_seo)
    seo {
      seoTitle
      seoDescription
      ogTitle
      ogDescription
      ogImage {
        id
        url
        alt
      }
    }
  }
}
```

---

## 9. Fallback Behavior (UI)

The UI implements the following fallback chain (in `seo-block.tsx`):

| Field | Fallback |
|-------|----------|
| `seoTitle` | → `title` |
| `seoDescription` | → `excerpt` |
| `ogTitle` | → `seoTitle` → `title` |
| `ogDescription` | → `seoDescription` → `excerpt` |
| `ogImage` | → Primary product image (variant media) |

All SEO fields are optional - the UI will use product data as fallbacks.
