# Implementation Plan: Admin-Next Full API Migration

**Status**: APPROVED
**Date**: 2026-02-11
**Review Iterations**: 2 (initial + 1 revision)

---

## Overview

| Property | Value |
|----------|-------|
| Feature | Complete migration from mock data to real GraphQL API |
| Application | admin-next-shell (Next.js 16 + React 19) |
| Pattern | Apollo Client with generated types |
| Key Principle | NO data mappers - render API types directly |

---

## Phase 1: Infrastructure Setup

### Step 1.1: Add Apollo Client Dependencies

**File**: `admin-next-shell/package.json`

```json
{
  "dependencies": {
    "@apollo/client": "^3.11.0",
    "graphql": "^16.9.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.0",
    "@graphql-codegen/typescript-operations": "^4.0.0",
    "@graphql-codegen/typescript-react-apollo": "^4.0.0",
    "@graphql-codegen/client-preset": "^4.0.0"
  }
}
```

### Step 1.2: Create Codegen Configuration

**File**: `admin-next-shell/codegen.ts`

- Schema path: `../services/infra/federation/supergraph-admin.graphql`
- Output: `src/graphql/generated.ts`
- Scalars: ID, DateTime, JSON, BigInt, CurrencyCode, Email, Upload, Timestamp, TransportOptions

### Step 1.3: Create Apollo Client Provider

**File**: `admin-next-shell/src/providers/ApolloProvider.tsx`

- SSR-safe auth using cookies (not localStorage)
- Type policies with `keyArgs: false` for pagination
- Cache-and-network fetch policy

### Step 1.4: Create GraphQL Helpers

**Files**:
- `src/graphql/helpers/userErrors.ts` - extractUserErrors, hasUserErrors, toFormErrors
- `src/graphql/helpers/pagination.ts` - getNodes, getNextPageVariables
- `src/graphql/index.ts` - Re-export all

### Step 1.5: Update Root Layout

Add ApolloProvider to `src/app/layout.tsx`

### Step 1.6: Add Environment Variables

- `.env.local`: `NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql`
- `.env.example`: Same with comments

### Step 1.7: Add NPM Scripts

```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

---

## Phase 2: Products List Page Migration

### Step 2.1: Create Product Fragments

**File**: `src/domains/inventory/products/graphql/fragments.ts`

**ProductListFragment** (for list view):
- `id`, `title`, `handle`, `isPublished`, `createdAt`, `updatedAt`, `variantsCount`
- `categories { id, name }`
- `variants(first: 1) { edges { node { id, price { currency, amountMinor }, inventoryItem { sku, totalAvailable }, media { file { id, url }, sortIndex } } } }`

**ProductDetailFragment** (for drawer):
- All list fields plus:
- `revision`, `description`, `excerpt`, `seo`
- `tags`, `options`, `features`
- `variants(first: 100)` with full variant data including:
  - `price { id, currency, amountMinor, compareAtMinor, isCurrent }`
  - `priceHistory(first: 5)`
  - `inventoryItem { sku, totalAvailable, dimensions, weight, stock { warehouse, quantityOnHand } }`
  - `selectedOptions { optionId, optionValueId }`

### Step 2.2: Create Products Query

**File**: `src/domains/inventory/products/graphql/queries/products.ts`

- `useProducts()` hook with pagination support
- Returns: `products`, `pageInfo`, `totalCount`, `loading`, `error`, `loadMore`, `hasMore`

### Step 2.3: Create Single Product Query

**File**: `src/domains/inventory/products/graphql/queries/product.ts`

- `useProduct({ id })` hook
- Returns: `product`, `loading`, `error`, `refetch`

### Step 2.4: Migrate Products Page

**File**: `src/domains/inventory/products/page/page.tsx`

- Replace mock data with `useProducts()` hook
- Update cell renderers to use correct API field paths:
  - SKU: `variants.edges[0].node.inventoryItem.sku`
  - Stock: `variants.edges[0].node.inventoryItem.totalAvailable`
  - Price: `variants.edges[0].node.price.amountMinor`
  - Image: `variants.edges[0].node.media[0].file.url`

---

## Phase 3: Product Drawer Migration

### Step 3.1: Migrate Product Drawer

**File**: `src/domains/inventory/products/drawers/ProductDrawer.tsx`

- Replace mock data with `useProduct()` hook
- Add loading, error, not-found states
- Display inventory by warehouse table using `inventoryItem.stock`
- Use correct field paths throughout

---

## Phase 4: Categories Page Migration

### Step 4.1-4.5: Category GraphQL and Drawer

Same pattern as products:
- `CategoryListFragment` and `CategoryDetailFragment`
- `useCategories()` and `useCategory()` hooks
- Category drawer with real API data

---

## Phase 5: Filter System GraphQL Adapter

### Step 5.1: Create GraphQL Filter Adapter

**File**: `src/layouts/filters/adapters/graphqlAdapter.ts`

- Converts frontend filter operators to GraphQL WhereInput format
- Operator mapping: `Eq` → `_eq`, `Like` → `_contains`, etc.
- Supports nested field paths

---

## Phase 6: Mutations

### Step 6.1: Product Mutations

**Files**:
- `mutations/productCreate.ts` - `useProductCreate()`
- `mutations/productUpdate.ts` - `useProductUpdate()` with optimistic locking
- `mutations/productDelete.ts` - `useProductDelete()`

All mutations:
- Return `{ success, product/deletedId, errors, graphqlError }`
- Use `refetchQueries` to update lists
- Extract userErrors for form display

---

## Phase 7: Mock Data Cleanup

After migration complete, remove:
- `IProduct` interface and `mockProducts` array from products page
- `mockProductsMap` from ProductDrawer
- `mockCategories` from CategoryDrawer

---

## Schema Field Reference

### Variant Fields (Correct Names)
| Field | Type | Notes |
|-------|------|-------|
| `price` | `VariantPrice` | NOT `pricing` |
| `inventoryItem` | `InventoryItem` | NOT `inventory` |
| `selectedOptions` | `[SelectedOption!]!` | NOT `optionValues` |
| `media[].file.url` | `String!` | NO `thumbnailUrl` |

### InventoryItem Fields
| Field | Type |
|-------|------|
| `sku` | `String` |
| `totalAvailable` | `Int!` |
| `stock[].quantityOnHand` | `Int!` |
| `dimensions.widthMm` | `Int!` |
| `weight.weightGrams` | `Int!` |

### VariantPrice Fields
| Field | Type |
|-------|------|
| `currency` | `CurrencyCode!` |
| `amountMinor` | `BigInt!` (string) |
| `compareAtMinor` | `BigInt` (string) |

---

## Build Requirements

```bash
# After Phase 1
cd /Users/phl/Projects/shopana-io/admin-next-shell
npm install
npm run codegen
npm run build

# After each phase
npm run codegen
npm run build
npm run dev  # Test locally

# Before commit
npm run lint
npm run build
```

---

## Testing Checklist

- [x] Supergraph recomposed with all queries (DONE)
- [ ] Codegen runs without errors
- [ ] Products page loads with real data
- [ ] Clicking product opens drawer with details
- [ ] Categories show in product drawer
- [ ] Filter widget displays correctly
- [ ] Search filters client-side
- [ ] Pagination works (load more)
- [ ] Error states display correctly
- [ ] Loading states show spinners
