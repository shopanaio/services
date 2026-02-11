# Architecture Decisions: Admin-Next API Migration

## Overview

- **Feature**: Complete migration from mock data to real GraphQL API
- **Application**: admin-next-shell (Next.js 16 + React 19)
- **Pattern**: Apollo Client with generated types
- **Key Principle**: NO data mappers - render API types directly

## Decisions

### Data Layer Structure

- **GraphQL Client**: Apollo Client 3.x
- **No data mapping classes**: Components render generated TypeScript types directly from API
- **Type generation**: graphql-codegen to generate types from admin API schema
- **File organization**: Domain-based with queries/mutations folders

### State Management

- **Server state**: Apollo Client InMemoryCache with normalized caching
- **UI state**: Keep Zustand for drawer state, selection state, etc.
- **No duplication**: Apollo cache is the single source of truth for API data

### API Integration Pattern

**Query/Mutation Organization:**
```
domains/{domain}/
  graphql/
    fragments.ts
    queries/
      products.ts
      product.ts
    mutations/
      productCreate.ts
      productUpdate.ts
```

**Cache Strategy:**
1. List views: `cache-and-network` - Show cached data immediately, refresh in background
2. Detail views: `cache-first` - Use cache if available
3. After mutations: `refetchQueries` to update affected lists
4. Type policies: `keyArgs: false` for pagination-only queries

**Error Handling:**
- Extract `userErrors` from mutation payloads using standardized helper
- Display field-level errors in forms
- Use React error boundaries for unexpected errors

### Migration Strategy

**Order:**
1. Infrastructure - Add Apollo, codegen, provider setup
2. Products list page - Highest visibility, core functionality
3. Product drawer - Detail view, tests drawer integration
4. Category pages - Similar pattern, validates approach
5. Filter system - Create GraphQL adapter for existing filter framework
6. Mutations - Create/Update/Delete operations

### Key Design Principles

1. **NO frontend data mappers** - Delete `Product.create()` pattern. Render API types directly.
2. **Generated types are source of truth** - Never manually create interfaces that duplicate API types
3. **Colocation** - Queries live next to components that use them
4. **Fragments for reuse** - Extract common field selections into fragments
5. **SSR-safe auth** - Use cookies instead of localStorage

## Reference Patterns

| Pattern | Location |
|---------|----------|
| Apollo Client setup | `/admin/src/modules/app/components/Apollo.tsx` |
| Query/Fragment structure | `/admin/src/modules/products/graphql/` |
| Supergraph schema | `/services/infra/federation/supergraph-admin.graphql` |
| Source catalog schema | `/services/catalog/src/api/graphql-admin/schema/` |
