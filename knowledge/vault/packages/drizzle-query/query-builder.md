---
tags:
  - drizzle-query
  - query-builder
  - fluent-api
  - immutable
related:
  - drizzle-query/index
  - drizzle-query/filters
  - drizzle-query/joins
---
# FluentQueryBuilder

Immutable query builder with configuration methods and execution.

## Overview

`FluentQueryBuilder` is the main class for building queries. It provides a fluent, immutable API where each configuration method returns a new builder instance.

## Creating a Query Builder

### Auto-discover Columns

```typescript
import { createQuery } from "@shopana/drizzle-query";

// Automatically discovers all columns from the table schema
const usersQuery = createQuery(users);
```

### Define Specific Fields

```typescript
import { createQuery, field } from "@shopana/drizzle-query";

const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  email: field(users.email),
  createdAt: field(users.createdAt),
});
```

### With Joins

```typescript
const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  address: field(users.addressId).leftJoin(addressQuery, addresses.id),
  organization: field(users.orgId).leftJoin(orgQuery, organizations.id),
});
```

## Configuration Methods

All configuration methods are **immutable** — they return a new builder instance:

```typescript
const base = createQuery(users);
const configured = base
  .defaultOrder({ field: "createdAt", direction: "desc" })
  .defaultLimit(20)
  .maxLimit(100);

// base and configured are separate instances
```

### defaultOrder()

Set default ordering when no order is specified:

```typescript
const query = createQuery(products)
  .defaultOrder({ field: "createdAt", direction: "desc" });

// Multiple default orders
const query = createQuery(products)
  .defaultOrder([
    { field: "featured", direction: "desc" },
    { field: "createdAt", direction: "desc" },
  ]);
```

### defaultLimit()

Set default limit when none specified:

```typescript
const query = createQuery(products)
  .defaultLimit(20);

// Without limit in execute, returns 20 results
await query.execute(db, { where: { status: "active" } });
```

### maxLimit()

Set maximum allowed limit:

```typescript
const query = createQuery(products)
  .maxLimit(100);

// Throws MaxLimitExceededError if limit > 100
await query.execute(db, { limit: 200 }); // Error!
```

### defaultSelect()

Set default fields to select:

```typescript
const query = createQuery(users)
  .defaultSelect(["id", "name", "email"]);

// Without select in execute, returns only these fields
await query.execute(db, { where: { status: "active" } });
```

### include()

Always include specific fields (even if not in select):

```typescript
const query = createQuery(products)
  .include(["id", "projectId"]);

// id and projectId always returned regardless of select
await query.execute(db, {
  select: ["name", "price"],  // Also includes id, projectId
});
```

### exclude()

Never return specific fields:

```typescript
const query = createQuery(users)
  .exclude(["password", "passwordHash", "salt"]);

// These fields are never returned
await query.execute(db, {
  select: ["*"],  // password, passwordHash, salt excluded
});
```

### defaultWhere()

Set default filter conditions:

```typescript
const query = createQuery(products)
  .defaultWhere({ deletedAt: { _is: null } });

// Soft-delete filter always applied
await query.execute(db, {
  where: { status: "active" },
  // Final where: { deletedAt: null, status: "active" }
});
```

### Chaining Configuration

```typescript
const productsQuery = createQuery(products)
  .defaultOrder({ field: "createdAt", direction: "desc" })
  .defaultLimit(20)
  .maxLimit(100)
  .defaultSelect(["id", "title", "price", "status"])
  .include(["id", "projectId"])
  .exclude(["internalNotes"])
  .defaultWhere({ deletedAt: { _is: null } });
```

## Executing Queries

### execute()

Execute query and return results:

```typescript
const results = await query.execute(db, {
  where: { status: "active", price: { _gte: 10 } },
  order: [{ field: "price", direction: "asc" }],
  select: ["id", "title", "price"],
  limit: 10,
  offset: 0,
});
```

### ExecuteOptions

```typescript
interface ExecuteOptions<TFields> {
  where?: WhereInput<TFields>;           // Filter conditions
  order?: OrderInput<TFields>[];         // Ordering
  select?: Array<keyof TFields>;         // Fields to return
  limit?: number;                         // Max results
  offset?: number;                        // Skip results
}
```

### getSql()

Get SQL without executing (for debugging):

```typescript
const sql = query.getSql({
  where: { status: "active" },
  limit: 10,
});

console.log(sql.toQuery());
// { sql: "SELECT ... FROM products WHERE ...", params: ["active"] }
```

### count()

Get total count matching filters:

```typescript
const total = await query.count(db, {
  where: { status: "active" },
});
// Returns: 42
```

### exists()

Check if any records match:

```typescript
const hasActive = await query.exists(db, {
  where: { status: "active" },
});
// Returns: true | false
```

### findFirst()

Get first matching record:

```typescript
const product = await query.findFirst(db, {
  where: { sku: "ABC123" },
});
// Returns: Product | null
```

### findFirstOrThrow()

Get first matching record or throw:

```typescript
const product = await query.findFirstOrThrow(db, {
  where: { sku: "ABC123" },
});
// Returns: Product
// Throws: NotFoundError if no match
```

## Full Example

```typescript
import { createQuery, field } from "@shopana/drizzle-query";

// Define query builder
const productsQuery = createQuery(products, {
  id: field(products.id),
  title: field(products.title),
  price: field(products.price),
  status: field(products.status),
  createdAt: field(products.createdAt),
  category: field(products.categoryId).leftJoin(categoryQuery, categories.id),
})
  .defaultOrder({ field: "createdAt", direction: "desc" })
  .defaultLimit(20)
  .maxLimit(100)
  .include(["id"])
  .defaultWhere({ deletedAt: { _is: null } });

// Execute query
const results = await productsQuery.execute(db, {
  where: {
    status: "active",
    price: { _gte: 10, _lte: 100 },
    category: { name: { _contains: "electronics" } },
  },
  order: [
    { field: "price", direction: "asc" },
  ],
  select: ["id", "title", "price", "category.name"],
  limit: 10,
});

// Get count
const total = await productsQuery.count(db, {
  where: { status: "active" },
});

// Check existence
const hasExpensive = await productsQuery.exists(db, {
  where: { price: { _gte: 1000 } },
});
```

## Immutability

The builder is immutable — each method returns a new instance:

```typescript
const base = createQuery(products);
const withLimit = base.maxLimit(100);
const withOrder = withLimit.defaultOrder({ field: "id", direction: "asc" });

// All three are independent instances
console.log(base === withLimit);      // false
console.log(withLimit === withOrder); // false

// Original is unchanged
await base.execute(db, { limit: 200 }); // Works (no maxLimit on base)
await withLimit.execute(db, { limit: 200 }); // Throws MaxLimitExceededError
```

## Caching

`FluentQueryBuilder` caches internal `ObjectSchema` and `QueryBuilder` instances for performance. The cache is automatically invalidated when configuration changes.

## Error Handling

```typescript
import { MaxLimitExceededError, InvalidFieldError } from "@shopana/drizzle-query";

try {
  await query.execute(db, { limit: 1000 }); // maxLimit is 100
} catch (error) {
  if (error instanceof MaxLimitExceededError) {
    console.log(`Limit ${error.requested} exceeds max ${error.maxLimit}`);
  }
}

try {
  await query.execute(db, { select: ["nonexistent"] });
} catch (error) {
  if (error instanceof InvalidFieldError) {
    console.log(`Field "${error.field}" not found`);
  }
}
```

## Related

- [[drizzle-query/index]] — Package overview
- [[drizzle-query/filters]] — Filter operators
- [[drizzle-query/joins]] — Automatic joins
- [[drizzle-query/cursor-pagination]] — Cursor-based pagination
