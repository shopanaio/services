# drizzle-gql-toolkit

Type-safe query builder for Drizzle ORM with GraphQL-style filtering. Build complex SQL queries with nested joins, typed filters, and automatic join resolution.

## Features

- **Type-safe filters** — Full autocomplete for nested paths like `items.product.category.slug`
- **Automatic joins** — JOINs are added only when nested fields are used in where/order/select
- **GraphQL-style operators** — `$eq`, `$in`, `$iLike`, `$and`, `$or`, etc.
- **Configurable limits** — `maxLimit`, `defaultLimit`, `maxJoinDepth` protection
- **Zero runtime overhead** — Types are compile-time only

## Installation

```bash
npm install @shopana/drizzle-gql-toolkit
```

## Quick Start

```ts
import { createSchema, createQueryBuilder } from "@shopana/drizzle-gql-toolkit";
import { orders, users } from "./schema";

// Define schema with joins
const orderSchema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount" },
    user: {
      column: "user_id",
      join: {
        type: "left",
        schema: () => userSchema,
        column: "id",
      },
    },
  },
});

// Create query builder
const qb = createQueryBuilder(orderSchema, {
  maxLimit: 100,
  defaultLimit: 20,
});

// Build queries with full type safety
const sql = qb.buildSelectSql({
  where: {
    status: { $in: ["pending", "processing"] },
    user: {
      email: { $iLike: "%@company.com" },
    },
  },
  order: ["user.email:asc", "totalAmount:desc"],
  limit: 50,
});
```

## Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal (implicit) | `{ status: "active" }` |
| `$neq` | Not equal | `{ status: { $neq: "deleted" } }` |
| `$gt`, `$gte` | Greater than | `{ price: { $gt: 100 } }` |
| `$lt`, `$lte` | Less than | `{ price: { $lte: 500 } }` |
| `$in` | In array | `{ id: { $in: [1, 2, 3] } }` |
| `$notIn` | Not in array | `{ status: { $notIn: ["cancelled"] } }` |
| `$like` | Pattern match | `{ sku: { $like: "PROD-%" } }` |
| `$iLike` | Case-insensitive | `{ email: { $iLike: "%@gmail.com" } }` |
| `$is` | IS NULL | `{ deletedAt: { $is: null } }` |
| `$isNot` | IS NOT NULL | `{ name: { $isNot: null } }` |
| `$and` | Logical AND | `{ $and: [{ a: 1 }, { b: 2 }] }` |
| `$or` | Logical OR | `{ $or: [{ a: 1 }, { b: 2 }] }` |

## API

### `createSchema(config)`

Creates a typed schema definition.

```ts
const schema = createSchema({
  table: users,           // Drizzle table
  tableName: "users",     // Alias prefix
  fields: { ... },        // Field definitions
  defaultFields: ["id"],  // Optional: default select
});
```

### `createQueryBuilder(schema, config?)`

Creates a query builder instance.

```ts
const qb = createQueryBuilder(schema, {
  maxLimit: 100,      // Cap for limit (default: 100)
  defaultLimit: 20,   // Default when not specified (default: 20)
  maxJoinDepth: 5,    // Prevent deep recursion (default: 5)
  debug: false,       // Enable logging
});
```

### Query Builder Methods

```ts
// Build complete SELECT query
qb.buildSelectSql(input): SQL

// Get parsed components
qb.fromInput(input): { where, joins, limit, offset, orderSql }

// Build WHERE clause only
qb.where(input): { sql, joins }

// Execute query with typed results
await qb.query(db, input): Promise<Types[]>

// Execute with typed select fields
await qb.querySelect(db, { select: ["id", "status"] as const })
```

## Type-Safe Results

Result types are inferred from schema field definitions. Use `alias` to map snake_case SQL columns to camelCase:

```ts
const orderSchema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    // alias maps "total_amount" → "totalAmount" in results
    totalAmount: { column: "total_amount", alias: "totalAmount" },
    createdAt: { column: "created_at", alias: "createdAt" },
  },
});

const qb = createQueryBuilder(orderSchema);

// SQL: SELECT "id", "total_amount" AS "totalAmount", "created_at" AS "createdAt"
const result = await qb.query(db);
// result type: { id: string; totalAmount: number; createdAt: Date }[]
```

## Nested Joins

Joins are automatically resolved when you reference nested paths:

```ts
// This query automatically adds:
// LEFT JOIN order_items ON orders.id = order_items.order_id
// LEFT JOIN products ON order_items.product_id = products.id
qb.buildSelectSql({
  where: {
    items: {
      product: {
        price: { $gte: 100 },
      },
    },
  },
  order: ["items.product.price:desc"],
});
```

## Error Handling

```ts
import {
  QueryBuilderError,
  InvalidFilterError,
  JoinDepthExceededError,
  UnknownFieldError,
} from "@shopana/drizzle-gql-toolkit";

try {
  qb.buildSelectSql({ where: { unknownField: "x" } });
} catch (e) {
  if (e instanceof UnknownFieldError) {
    console.log(e.code); // "UNKNOWN_FIELD"
  }
}
```

## License

Apache-2.0
