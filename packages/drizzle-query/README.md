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

Stable, efficient keyset pagination with support for multi-field sorting and nested paths.

### Relay-style (first/after, last/before)

```typescript
import { createSchema } from "@shopana/drizzle-query";
import { createRelayBuilder } from "@shopana/drizzle-query/cursor";

// Define schema with joins
const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
      },
    },
  },
});

const productsPagination = createRelayBuilder(productsSchema, {
  cursorType: "product",
  tieBreaker: "id",
});

// Forward pagination
const firstPage = await productsPagination.query(db, {
  first: 10,
  orderBy: [{ field: "price", direction: "desc" }],
  where: { status: "active" },
  select: ["id", "handle", "price"],
});

// Next page
const nextPage = await productsPagination.query(db, {
  first: 10,
  after: firstPage.pageInfo.endCursor,
  orderBy: [{ field: "price", direction: "desc" }],
  select: ["id", "handle", "price"],
});

// Backward pagination
const prevPage = await productsPagination.query(db, {
  last: 10,
  before: nextPage.pageInfo.startCursor,
  orderBy: [{ field: "price", direction: "desc" }],
  select: ["id", "handle", "price"],
});
```

### Sorting by Nested Fields

```typescript
// Sort by joined table field
const page = await productsPagination.query(db, {
  first: 20,
  orderBy: [{ field: "translation.value", direction: "asc" }],
  select: ["id", "handle", "translation.value"],
});

// Multi-field sort with nested paths
const results = await productsPagination.query(db, {
  first: 20,
  orderBy: [
    { field: "price", direction: "asc" },
    { field: "translation.value", direction: "asc" },
  ],
  select: ["id", "price", "translation.value"],
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

## View Support

Full support for Drizzle ORM views with the same API as tables.

### Basic View Query

```typescript
import { pgView, sql } from "drizzle-orm/pg-core";

// Define a view
const productStatsView = pgView("product_stats_view").as((qb) =>
  qb
    .select({
      productId: orderItems.productId,
      totalSold: sql<number>`SUM(${orderItems.quantity})`.as("total_sold"),
      revenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.price})`.as("revenue"),
    })
    .from(orderItems)
    .groupBy(orderItems.productId)
);

// Create query from view (auto-discovers all fields)
const statsQuery = createQuery(productStatsView);

// Execute with filters and sorting
const results = await statsQuery.execute(db, {
  select: ["productId", "totalSold", "revenue"],
  where: { totalSold: { _gte: 100 } },
  order: [{ field: "revenue", direction: "desc" }],
});
```

### View with Custom Fields

```typescript
// Define fields explicitly (supports SQL.Aliased fields)
const statsQuery = createQuery(productStatsView, {
  productId: field(productStatsView.productId),
  totalSold: field(productStatsView.totalSold),    // SQL.Aliased field
  revenue: field(productStatsView.revenue),         // SQL.Aliased field
});
```

### Table → View JOINs

```typescript
// Join table to view
const productsWithStats = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  price: field(products.price),
  // LEFT JOIN to stats view
  stats: field(products.id).leftJoin(statsQuery, productStatsView.productId),
});

// Use nested paths with view fields
const results = await productsWithStats.execute(db, {
  select: ["id", "sku", "stats.totalSold", "stats.revenue"],
  where: {
    stats: { totalSold: { _gte: 50 } },
    price: { _lte: 100 },
  },
  order: [{ field: "stats.revenue", direction: "desc" }],
});
```

### View → Table JOINs

```typescript
const activeUsersView = pgView("active_users_view").as((qb) =>
  qb.select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`${users.isActive} = true`)
);

// Join view to table
const usersWithOrders = createQuery(activeUsersView, {
  id: field(activeUsersView.id),
  email: field(activeUsersView.email),
  orders: field(activeUsersView.id).leftJoin(ordersQuery, orders.userId),
});
```

### View → View JOINs

```typescript
// Join view to another view
const productsWithCategoryStats = createQuery(publishedProductsView, {
  id: field(publishedProductsView.id),
  categoryId: field(publishedProductsView.categoryId),
  categoryStats: field(publishedProductsView.categoryId).leftJoin(
    categoryStatsViewQuery,
    categoryStatsView.categoryId
  ),
});
```

### Deep Nested JOINs with Views

```typescript
// View → Table → Table chain
const publishedWithTranslations = createQuery(publishedProductsView, {
  id: field(publishedProductsView.id),
  sku: field(publishedProductsView.sku),
  category: field(publishedProductsView.categoryId).leftJoin(
    categoriesWithTranslationsQuery,  // Table with nested translation join
    categories.id
  ),
});

// Query with deep nested paths
const results = await publishedWithTranslations.execute(db, {
  select: ["id", "sku", "category.slug", "category.translation.value"],
  where: {
    category: {
      isVisible: { _eq: true },
      translation: { locale: { _eq: "en" } },
    },
  },
  order: [
    { field: "category.translation.value", direction: "asc" },
    { field: "category.slug", direction: "asc" },
  ],
});
```

### Schema-Qualified Views

```typescript
import { pgSchema } from "drizzle-orm/pg-core";

const analyticsSchema = pgSchema("analytics");

const userActivityView = analyticsSchema.view("user_activity_view").as((qb) =>
  qb.select({
    userId: users.id,
    daysSinceCreation: sql<number>`EXTRACT(DAY FROM NOW() - ${users.createdAt})`.as("days_since_creation"),
  }).from(users)
);

// Works the same way
const activityQuery = createQuery(userActivityView);
// Generates: FROM "analytics"."user_activity_view" AS "t0_user_activity_view"
```

### Cursor Pagination with Views

Views fully support cursor pagination with nested field sorting:

```typescript
import { createSchema } from "@shopana/drizzle-query";
import { createRelayBuilder } from "@shopana/drizzle-query/cursor";

// Define view schema with translation join
const productsViewSchema = createSchema({
  table: productsView,
  tableName: "products_view",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    priceRange: { column: "price_range" },
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
      },
    },
  },
});

// Create relay builder
const productsRelay = createRelayBuilder(productsViewSchema, {
  cursorType: "product",
  tieBreaker: "id",
});

// Paginate with nested field sorting
const page1 = await productsRelay.query(db, {
  first: 10,
  orderBy: [{ field: "translation.value", direction: "asc" }],
  select: ["id", "handle", "priceRange", "translation.value"],
});

// Cursor contains nested field values
// { seek: [{ field: "translation.value", value: "Alpha", direction: "asc" }, { field: "id", ... }] }

// Continue pagination
const page2 = await productsRelay.query(db, {
  first: 10,
  after: page1.pageInfo.endCursor,
  orderBy: [{ field: "translation.value", direction: "asc" }],
  select: ["id", "handle", "translation.value"],
});
```

#### Multi-field Sort with Nested Paths

```typescript
// Sort by multiple fields including nested
const results = await productsRelay.query(db, {
  first: 20,
  orderBy: [
    { field: "price", direction: "asc" },
    { field: "translation.value", direction: "asc" },
  ],
  where: {
    priceRange: { _eq: "mid-range" },
    translation: { searchValue: { _containsi: "phone" } },
  },
  select: ["id", "price", "priceRange", "translation.value"],
});

// Cursor structure includes all sort fields + tieBreaker:
// seek: [
//   { field: "price", value: 500, direction: "asc" },
//   { field: "translation.value", value: "Smartphone", direction: "asc" },
//   { field: "id", value: "uuid-123", direction: "asc" }
// ]
```

#### Backward Pagination with Views

```typescript
// Get last N items
const lastPage = await productsRelay.query(db, {
  last: 10,
  orderBy: [{ field: "translation.value", direction: "asc" }],
  select: ["id", "translation.value"],
});

// Go backward from a cursor
const prevPage = await productsRelay.query(db, {
  last: 10,
  before: lastPage.pageInfo.startCursor,
  orderBy: [{ field: "translation.value", direction: "asc" }],
  select: ["id", "translation.value"],
});
```

### View Features Summary

| Feature | Support |
|---------|---------|
| Auto-discover view fields | ✅ |
| SQL.Aliased fields (computed columns) | ✅ |
| WHERE on view fields | ✅ |
| ORDER BY on view fields | ✅ |
| ORDER BY on nested joined fields | ✅ |
| Table → View JOINs | ✅ |
| View → Table JOINs | ✅ |
| View → View JOINs | ✅ |
| Deep nested JOINs (3+ levels) | ✅ |
| All JOIN types (LEFT, INNER, RIGHT, FULL) | ✅ |
| Schema-qualified views | ✅ |
| Complex _and/_or conditions | ✅ |
| Relay cursor pagination | ✅ |
| Cursor with nested sort fields | ✅ |
| Multi-field cursor (lexicographic) | ✅ |
| Backward pagination (last/before) | ✅ |

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (recommended for best type inference)
- drizzle-orm >= 0.30.0

## License

Apache-2.0
