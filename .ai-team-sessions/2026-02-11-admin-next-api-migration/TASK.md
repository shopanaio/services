# Task: Admin-Next Full API Migration

**Date:** 2026-02-11
**Service:** admin-next-shell (frontend)
**Pattern:** Full Frontend Rewrite

## Summary

Migrate admin-next frontend from mock data to real GraphQL API. This involves removing all hardcoded mock data, adding a GraphQL client, and redesigning the data layer to render API data directly without frontend data mappings.

## Current State Analysis

### Mock Data Found

| File | Mock Type | Description |
|------|-----------|-------------|
| `src/domains/inventory/products/page/page.tsx` | `mockProducts[]` | 50 fake products with random data |
| `src/domains/inventory/products/page/page.tsx` | `productNames[]` | 50 hardcoded product names |
| `src/domains/inventory/products/page/page.tsx` | `IProduct` interface | Frontend-specific interface (not matching API) |
| `src/domains/inventory/products/drawers/ProductDrawer.tsx` | `mockProductsMap` | 5 hardcoded product objects |

### Key Problems with Current Approach

1. **Frontend-specific interfaces** (`IProduct`) that don't match the API schema
2. **Mock data generation** functions creating random data client-side
3. **No GraphQL client** - package.json has no Apollo/URQL dependency
4. **Data transformation patterns** - old admin has `Product.create()` mappers that add complexity

### Admin GraphQL API Schema (Relevant Parts)

```graphql
# Product Type (from catalog service)
type Product implements Node {
  id: ID!
  handle: String
  publishedAt: DateTime
  isPublished: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  variants(first: Int, after: String): VariantConnection!
  options: [ProductOption!]!
  features: [ProductFeature!]!
  variantsCount: Int!
  categories: [Category!]!
  tags: [Tag!]!
  title: String!
  description: Description
  excerpt: String
  seo: ProductSeo
}

# Queries Available
type CatalogQuery {
  product(id: ID!): Product
  products(first: Int, after: String, last: Int, before: String): ProductConnection!
  category(id: ID!): Category
  categories(...): CategoryConnection!
}

# Filters (from base-filters.graphql)
input StringFilter { _eq, _neq, _in, _contains, _containsi, ... }
input IntFilter { _eq, _gt, _gte, _lt, _lte, _between, ... }
input DateTimeFilter { _eq, _gt, _gte, _lt, _lte, _between, ... }
```

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| GraphQL Client | Apollo Client | Already used in old admin, proven pattern, built-in caching |
| State Management | Apollo Cache + Zustand | Apollo for server state, Zustand for UI state (already used) |
| Data Layer | No mapping classes | Components render API types directly |
| Type Generation | graphql-codegen | Generate TypeScript types from schema |
| Filter Adapter | Existing filter system | `IFilterAdapter` pattern already designed for API output |

## Architecture Approach

### 1. Data Layer Structure

```
src/
  lib/
    graphql/
      client.ts           # Apollo client setup
      fragments/          # Shared GraphQL fragments
        product.ts
        category.ts
      generated/          # Auto-generated types (codegen)
        types.ts

  domains/
    inventory/
      products/
        queries/
          products.ts     # gql`` queries and hooks
          product.ts
        mutations/
          productCreate.ts
          productUpdate.ts
        page/
          page.tsx        # Component using queries directly
        drawers/
          ProductDrawer.tsx
```

### 2. No Data Mapping - Render API Types Directly

**OLD pattern (DO NOT USE):**
```typescript
// Old admin - creates frontend-specific interface
interface IProduct { ... }  // Different from API
class Product {
  static create(apiData: ApiProduct): IProduct { ... }
}
// Component uses IProduct
```

**NEW pattern:**
```typescript
// Use generated types directly
import { Product } from '@/lib/graphql/generated/types';

// Component uses API type directly
function ProductRow({ product }: { product: Product }) {
  return <div>{product.title}</div>;
}
```

### 3. GraphQL Client Setup

```typescript
// src/lib/graphql/client.ts
import { ApolloClient, InMemoryCache } from '@apollo/client';

export const apolloClient = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_ADMIN_API_URL,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          catalogQuery: { merge: true },
        },
      },
    },
  }),
});
```

### 4. Query Organization

```typescript
// src/domains/inventory/products/queries/products.ts
import { gql, useQuery } from '@apollo/client';

const PRODUCTS_QUERY = gql`
  query Products($first: Int, $after: String) {
    catalogQuery {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            title
            handle
            isPublished
            variantsCount
            categories {
              id
              name
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }
`;

export function useProducts(first: number = 20, after?: string) {
  return useQuery(PRODUCTS_QUERY, {
    variables: { first, after },
  });
}
```

## API Integration Pattern

### Query/Mutation Organization

| Location | Purpose |
|----------|---------|
| `domains/{domain}/queries/*.ts` | Domain-specific queries |
| `domains/{domain}/mutations/*.ts` | Domain-specific mutations |
| `lib/graphql/fragments/*.ts` | Shared fragments |

### Cache Strategy

1. **Normalized cache** - Apollo automatically normalizes by `__typename:id`
2. **Fetch policies:**
   - List queries: `cache-and-network` (show cached, update in background)
   - Detail queries: `cache-first` (use cache if available)
   - After mutations: `refetchQueries` to update lists

### Error Handling

```typescript
// Standardized error extraction
function extractUserErrors(data: { userErrors: GenericUserError[] }) {
  return data.userErrors.map(e => ({
    field: e.field?.join('.'),
    message: e.message,
    code: e.code,
  }));
}
```

## Filter System Integration

The existing filter system (`src/layouts/filters`) already has `IFilterAdapter` interface:

```typescript
interface IFilterAdapter<TOutput> {
  convert(filter: IFilterValue, schema: IFilterSchema): TOutput;
  combine(filters: TOutput[], logic: 'AND' | 'OR'): TOutput;
  build(combined: TOutput): unknown;
}
```

Create API-specific adapter:

```typescript
// src/lib/graphql/filters/graphqlFilterAdapter.ts
export class GraphQLFilterAdapter implements IFilterAdapter<WhereInput> {
  convert(filter: IFilterValue): WhereInput {
    // Map FilterOperator to GraphQL filter operators
    // FilterOperator.Eq -> { _eq: value }
    // FilterOperator.In -> { _in: values }
    // etc.
  }
}
```

## Migration Strategy

### Phase 1: Infrastructure (Do First)
1. Add Apollo Client dependencies
2. Setup GraphQL codegen
3. Create client configuration
4. Add Apollo Provider to app layout

### Phase 2: Products Page Migration
1. Create products query with fragments
2. Replace `mockProducts` with `useProducts()` hook
3. Update `IProduct` interface to use generated `Product` type
4. Update AG Grid columns to match API fields

### Phase 3: Drawers Migration
1. Create product query for single product
2. Replace `mockProductsMap` with real query
3. Update drawer to use API data structure

### Phase 4: Filter System
1. Create GraphQL filter adapter
2. Connect filter system to API queries
3. Add `where` parameter to queries

## Component Interface Changes

### Before (Mock Data)
```typescript
interface IProduct {
  id: string;
  name: string;      // <-- Different from API
  sku: string;
  price: number;
  stock: number;
  status: "active" | "draft" | "archived";
  category: string;  // <-- String, not Category object
  image: string;
}
```

### After (API Data)
```typescript
// Generated from schema
type Product = {
  id: string;
  title: string;     // <-- Matches API
  handle: string | null;
  isPublished: boolean;
  variants: VariantConnection;
  categories: Category[];  // <-- Full objects
  // ... all API fields
}
```

## Build Requirements

| Requirement | Needed | Reason |
|-------------|--------|--------|
| Schema rebuild | No | Backend schema already exists |
| Codegen | Yes | Generate TypeScript types from GraphQL schema |
| Package install | Yes | Add @apollo/client, graphql, codegen dependencies |

## Edge Cases

1. **Empty states**: Handle `totalCount: 0` with proper empty UI
2. **Loading states**: AG Grid skeleton while fetching
3. **Optimistic updates**: Use Apollo's optimistic response for mutations
4. **Pagination**: Cursor-based pagination matches AG Grid infinite scroll
5. **Error boundaries**: Wrap queries in error boundaries

## Dependencies to Add

```json
{
  "@apollo/client": "^3.13.1",
  "graphql": "^16.8.1",
  "@graphql-codegen/cli": "^5.0.0",
  "@graphql-codegen/typescript": "^4.0.1",
  "@graphql-codegen/typescript-operations": "^4.0.1"
}
```

## References

- Old admin Apollo setup: `/Users/phl/Projects/shopana-io/admin/`
- Product schema: `/Users/phl/Projects/shopana-io/services/services/catalog/src/api/graphql-admin/schema/product.graphql`
- Filter types: `/Users/phl/Projects/shopana-io/services/services/catalog/src/api/graphql-admin/schema/__generated__/base-filters.graphql`
- Current mock data: `/Users/phl/Projects/shopana-io/admin-next-shell/src/domains/inventory/products/page/page.tsx`
