# @shopana/drizzle-query

Type-safe query builder for Drizzle ORM with GraphQL-style filtering, automatic joins, and cursor pagination.

## Features

- **Type-safe queries** - Full TypeScript inference for select, where, and order fields
- **GraphQL-style filters** - Rich operator support (`$eq`, `$gt`, `$contains`, `$in`, etc.)
- **Automatic joins** - Define relationships once, use nested paths everywhere
- **Cursor pagination** - Stable, efficient pagination with Relay Connection support
- **Immutable builders** - Fluent API with method chaining

## Installation

```bash
npm install @shopana/drizzle-query
```

**Peer dependency:** `drizzle-orm >= 0.30.0`

## Quick Start

### Basic Query Builder

```typescript
import { createQuery, field } from "@shopana/drizzle-query";
import { users } from "./schema";

// Create query from table (auto-discovers all columns)
const usersQuery = createQuery(users);

// Or define specific fields
const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  email: field(users.email),
});

// Configure defaults (immutable - returns new instance)
const configuredQuery = usersQuery
  .defaultOrder("createdAt:desc")
  .defaultLimit(20)
  .maxLimit(100);

// Execute query
const results = await configuredQuery.execute(db, {
  where: { status: "active", name: { $contains: "john" } },
  order: ["name:asc"],
  limit: 10,
});
```

### Automatic Joins with Nested Paths

```typescript
const addressQuery = createQuery(addresses);

const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  // Define join relationship
  address: field(users.addressId).leftJoin(addressQuery, addresses.id),
});

// Use nested paths - joins are added automatically
const results = await usersQuery.execute(db, {
  select: ["id", "name", "address.city", "address.country"],
  where: { address: { country: "US" } },
  order: ["address.city:asc"],
});
```

## Filter Operators

All filter operators are available on any field:

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal | `{ status: { $eq: "active" } }` |
| `$neq` | Not equal | `{ status: { $neq: "deleted" } }` |
| `$gt` | Greater than | `{ age: { $gt: 18 } }` |
| `$gte` | Greater than or equal | `{ age: { $gte: 18 } }` |
| `$lt` | Less than | `{ price: { $lt: 100 } }` |
| `$lte` | Less than or equal | `{ price: { $lte: 100 } }` |
| `$in` | In array | `{ status: { $in: ["a", "b"] } }` |
| `$notIn` | Not in array | `{ status: { $notIn: ["x"] } }` |
| `$is` | Is null | `{ deletedAt: { $is: null } }` |
| `$isNot` | Is not null | `{ email: { $isNot: null } }` |
| `$contains` | Contains (case-sensitive) | `{ name: { $contains: "john" } }` |
| `$containsi` | Contains (case-insensitive) | `{ name: { $containsi: "john" } }` |
| `$startsWith` | Starts with | `{ email: { $startsWith: "admin" } }` |
| `$endsWith` | Ends with | `{ email: { $endsWith: ".com" } }` |
| `$between` | Between range | `{ price: { $between: [10, 50] } }` |

### Logical Operators

```typescript
// AND (implicit - all conditions must match)
{ status: "active", role: "admin" }

// Explicit $and
{ $and: [{ status: "active" }, { role: "admin" }] }

// OR
{ $or: [{ role: "admin" }, { role: "moderator" }] }

// NOT
{ $not: { status: "deleted" } }

// Combined
{
  status: "active",
  $or: [
    { role: "admin" },
    { permissions: { $contains: "write" } }
  ]
}
```

## Cursor Pagination

### Relay-style (first/after, last/before)

```typescript
import { createQuery } from "@shopana/drizzle-query";
import { createRelayQuery } from "@shopana/drizzle-query/relay";

const productsQuery = createQuery(products)
  .defaultOrder("createdAt:desc")
  .maxLimit(100);

const productsPagination = createRelayQuery(productsQuery, {
  name: "product",
  tieBreaker: "id",
});

// Forward pagination
const firstPage = await productsPagination.execute(db, {
  first: 10,
  where: { status: "active" },
});

// Next page
const nextPage = await productsPagination.execute(db, {
  first: 10,
  after: firstPage.pageInfo.endCursor,
});

// Backward pagination
const prevPage = await productsPagination.execute(db, {
  last: 10,
  before: nextPage.pageInfo.startCursor,
});
```

#### Relay Result

```typescript
type RelayQueryResult<T> = {
  edges: Array<{
    cursor: string;
    node: T;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  filtersChanged: boolean;
};
```

### Base Cursor (limit/direction/cursor)

```typescript
import { createQuery } from "@shopana/drizzle-query";
import { createCursorQuery } from "@shopana/drizzle-query/cursor";

const productsQuery = createQuery(products)
  .defaultOrder("createdAt:desc")
  .maxLimit(100);

const productsCursor = createCursorQuery(productsQuery, {
  name: "product",
  tieBreaker: "id",
});

// Forward pagination
const page1 = await productsCursor.execute(db, {
  limit: 10,
  direction: "forward",
  where: { status: "active" },
});

// Next page
const page2 = await productsCursor.execute(db, {
  limit: 10,
  direction: "forward",
  cursor: page1.endCursor,
});

// Backward pagination
const prevPage = await productsCursor.execute(db, {
  limit: 10,
  direction: "backward",
  cursor: page2.startCursor,
});
```

#### Cursor Result

```typescript
type CursorQueryResult<T> = {
  items: T[];
  cursors: string[];
  hasMore: boolean;
  startCursor: string | null;
  endCursor: string | null;
  filtersChanged: boolean;
};
```

## Configuration Options

### Query Builder Config

```typescript
const query = createQuery(users)
  .defaultOrder("createdAt:desc")  // Default sort order
  .defaultLimit(20)                 // Default page size
  .maxLimit(100)                    // Maximum allowed limit
  .defaultSelect(["id", "name"])    // Default fields to return
  .include(["id"])                  // Always include these fields
  .exclude(["password"])            // Never return these fields
  .defaultWhere({ deletedAt: null }); // Default filter
```

### Getting SQL Without Executing

```typescript
const sql = query.getSql({
  where: { status: "active" },
  limit: 10,
});

console.log(sql.toQuery()); // { sql: "SELECT ...", params: [...] }
```

## Types

### Exported Types

```typescript
import type {
  // Query types
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
  FilterOperators,
  FilterValue,
  ScalarValue,
  QueryBuilderConfig,
  DrizzleExecutor,
} from "@shopana/drizzle-query";

import type {
  // Cursor pagination types
  CursorQueryConfig,
  CursorQueryInput,
  CursorQueryResult,
  CursorDirection,
} from "@shopana/drizzle-query/cursor";

import type {
  // Relay pagination types
  RelayQueryConfig,
  RelayQueryInput,
  RelayQueryResult,
  Connection,
  Edge,
  PageInfo,
} from "@shopana/drizzle-query/relay";
```

## Join Types

```typescript
// Available join types
field(users.addressId).leftJoin(addressQuery, addresses.id)
field(users.addressId).innerJoin(addressQuery, addresses.id)
field(users.addressId).rightJoin(addressQuery, addresses.id)
field(users.addressId).fullJoin(addressQuery, addresses.id)
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (recommended for best type inference)
- drizzle-orm >= 0.30.0

## License

Apache-2.0
