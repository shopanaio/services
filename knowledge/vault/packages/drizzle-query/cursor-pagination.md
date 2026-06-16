---
tags:
  - drizzle-query
  - pagination
  - cursor
  - relay
  - keyset
related:
  - drizzle-query/index
  - drizzle-query/query-builder
  - type-resolver
---
# Cursor Pagination

Stable keyset pagination with Relay Connection specification support.

## Overview

Cursor-based pagination provides stable, performant pagination for large datasets. Unlike offset-based pagination, cursors remain valid even when records are added or removed.

### Why Cursor Pagination?

| Feature | Offset Pagination | Cursor Pagination |
|---------|-------------------|-------------------|
| Performance | O(n) - skips rows | O(1) - seeks directly |
| Stability | Pages shift on insert/delete | Stable position |
| Deep pages | Slow for large offsets | Consistent speed |
| Real-time | Duplicates/gaps possible | No duplicates |

## Creating a Relay Builder

```typescript
import { createSchema } from "@shopana/drizzle-query";
import { createRelayBuilder } from "@shopana/drizzle-query/cursor";

// First, define the schema
const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    createdAt: { column: "created_at" },
    // With join
    category: {
      column: "category_id",
      join: {
        schema: () => categoriesSchema,
        column: "id",
      },
    },
  },
});

// Create the pagination builder
const productsPagination = createRelayBuilder(productsSchema, {
  cursorType: "product",  // Cursor type identifier
  tieBreaker: "id",       // Ensures stable ordering
});
```

## Relay Pagination

### Forward Pagination (first/after)

```typescript
// First page
const page1 = await productsPagination.query(db, {
  first: 10,
  orderBy: [{ field: "createdAt", direction: "desc" }],
  where: { status: "active" },
  select: ["id", "handle", "price"],
});

// Next page using endCursor
const page2 = await productsPagination.query(db, {
  first: 10,
  after: page1.pageInfo.endCursor,
  orderBy: [{ field: "createdAt", direction: "desc" }],
  where: { status: "active" },
  select: ["id", "handle", "price"],
});
```

### Backward Pagination (last/before)

```typescript
// Last page
const lastPage = await productsPagination.query(db, {
  last: 10,
  orderBy: [{ field: "createdAt", direction: "desc" }],
});

// Previous page using startCursor
const prevPage = await productsPagination.query(db, {
  last: 10,
  before: lastPage.pageInfo.startCursor,
  orderBy: [{ field: "createdAt", direction: "desc" }],
});
```

## Query Parameters

```typescript
interface RelayQueryInput<TFields> {
  // Pagination
  first?: number;         // Forward: get first N items
  after?: string;         // Forward: cursor to start after
  last?: number;          // Backward: get last N items
  before?: string;        // Backward: cursor to start before

  // Filtering and sorting
  where?: WhereInput<TFields>;
  orderBy?: OrderInput<TFields>[];
  select?: Array<keyof TFields>;
}
```

## Result Structure

```typescript
interface RelayResult<T> {
  edges: Array<{
    cursor: string;  // Opaque cursor for this node
    node: T;         // The actual data
  }>;
  pageInfo: {
    hasNextPage: boolean;      // More items after endCursor
    hasPreviousPage: boolean;  // More items before startCursor
    startCursor: string | null; // First edge cursor
    endCursor: string | null;   // Last edge cursor
  };
  filtersChanged: boolean;  // True if cursor was invalidated
}
```

### Example Response

```typescript
{
  edges: [
    {
      cursor: "eyJ0IjoicHJvZHVjdCIsInYiOlsiMjAyNC0wMS0xNSIsInByb2RfMTIzIl19",
      node: { id: "prod_123", handle: "widget", price: 29.99 }
    },
    {
      cursor: "eyJ0IjoicHJvZHVjdCIsInYiOlsiMjAyNC0wMS0xNCIsInByb2RfNDU2Il19",
      node: { id: "prod_456", handle: "gadget", price: 49.99 }
    },
  ],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: "eyJ0IjoicHJvZHVjdCIsInYiOlsiMjAyNC0wMS0xNSIsInByb2RfMTIzIl19",
    endCursor: "eyJ0IjoicHJvZHVjdCIsInYiOlsiMjAyNC0wMS0xNCIsInByb2RfNDU2Il19"
  },
  filtersChanged: false
}
```

## Tie Breaker

The `tieBreaker` field ensures stable ordering when the primary sort field has duplicates:

```typescript
const pagination = createRelayBuilder(productsSchema, {
  cursorType: "product",
  tieBreaker: "id",  // Always unique
});

// Even if multiple products have same price, ordering is stable
await pagination.query(db, {
  first: 10,
  orderBy: [{ field: "price", direction: "asc" }],
});
// Internal: ORDER BY price ASC, id ASC
```

## Sorting by Nested Fields

```typescript
const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    price: { column: "price" },
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entity_id",
      },
    },
  },
});

// Sort by nested field
const page = await productsPagination.query(db, {
  first: 20,
  orderBy: [
    { field: "translation.value", direction: "asc" },
    { field: "price", direction: "desc" },
  ],
  select: ["id", "price", "translation.value"],
});
```

## Filter Changes

When filters change, previously fetched cursors may be invalid. The `filtersChanged` flag indicates this:

```typescript
// Initial query with category filter
const page1 = await pagination.query(db, {
  first: 10,
  where: { categoryId: "cat_1" },
});

// Same cursor but different filter — cursor invalidated
const page2 = await pagination.query(db, {
  first: 10,
  after: page1.pageInfo.endCursor,
  where: { categoryId: "cat_2" },  // Different!
});

console.log(page2.filtersChanged); // true
// Result starts from beginning with new filters
```

## Cursor Structure

Cursors are opaque, base64-encoded strings containing:

```typescript
interface CursorPayload {
  t: string;        // Type identifier (cursorType)
  v: unknown[];     // Values for orderBy fields + tieBreaker
  f?: string;       // Filter hash (for change detection)
}
```

**Note:** Cursors are opaque to clients. Never parse or construct them manually.

## Total Count

Get total matching count alongside pagination:

```typescript
const [result, totalCount] = await Promise.all([
  pagination.query(db, {
    first: 10,
    where: { status: "active" },
  }),
  pagination.count(db, {
    where: { status: "active" },
  }),
]);

console.log(`Showing ${result.edges.length} of ${totalCount} products`);
```

## Full Example

```typescript
import { createSchema } from "@shopana/drizzle-query";
import { createRelayBuilder } from "@shopana/drizzle-query/cursor";

// Define schema
const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    status: { column: "status" },
    createdAt: { column: "created_at" },
    category: {
      column: "category_id",
      join: {
        schema: () => categoriesSchema,
        column: "id",
      },
    },
  },
});

// Create builder
const productsPagination = createRelayBuilder(productsSchema, {
  cursorType: "product",
  tieBreaker: "id",
  defaultLimit: 20,
  maxLimit: 100,
});

// GraphQL resolver usage
async function resolveProducts(args: ProductsArgs): Promise<ProductConnection> {
  const result = await productsPagination.query(db, {
    first: args.first,
    after: args.after,
    last: args.last,
    before: args.before,
    where: {
      status: "active",
      ...(args.categoryId && { category: { id: args.categoryId } }),
      ...(args.minPrice && { price: { _gte: args.minPrice } }),
    },
    orderBy: args.sortBy
      ? [{ field: args.sortBy, direction: args.sortDirection ?? "asc" }]
      : [{ field: "createdAt", direction: "desc" }],
    select: ["id", "handle", "price", "category.name"],
  });

  return {
    edges: result.edges,
    pageInfo: result.pageInfo,
  };
}
```

## Error Handling

```typescript
import { InvalidCursorError, MaxLimitExceededError } from "@shopana/drizzle-query";

try {
  await pagination.query(db, {
    first: 10,
    after: "invalid-cursor",
  });
} catch (error) {
  if (error instanceof InvalidCursorError) {
    // Cursor is malformed or for wrong type
    console.log("Invalid cursor:", error.message);
  }
}

try {
  await pagination.query(db, {
    first: 500,  // maxLimit is 100
  });
} catch (error) {
  if (error instanceof MaxLimitExceededError) {
    console.log(`Max limit is ${error.maxLimit}`);
  }
}
```

## Related

- [[drizzle-query/index]] — Package overview
- [[drizzle-query/query-builder]] — Underlying query builder
- [[type-resolver/index]] — GraphQL resolver framework
- [[type-resolver/drizzle-integration]] — Integration with type-resolver
