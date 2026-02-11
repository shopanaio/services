---
tags:
  - drizzle-query
  - filters
  - operators
  - where
  - graphql
related:
  - drizzle-query/index
  - drizzle-query/query-builder
---
# Filter Operators

GraphQL-style filter operators for building where conditions.

## Overview

All operators use underscore prefix (`_eq`, `_gt`, etc.) following GraphQL conventions. This makes them easily distinguishable from field names and enables type-safe filter building.

## Comparison Operators

### Equality

| Operator | Description | SQL Equivalent |
|----------|-------------|----------------|
| `_eq` | Equal to | `= value` |
| `_neq` | Not equal to | `!= value` |

```typescript
// Exact match
{ status: { _eq: "active" } }
// SQL: status = 'active'

// Shorthand (implicit _eq)
{ status: "active" }
// SQL: status = 'active'

// Not equal
{ status: { _neq: "deleted" } }
// SQL: status != 'deleted'
```

### Numeric Comparison

| Operator | Description | SQL Equivalent |
|----------|-------------|----------------|
| `_gt` | Greater than | `> value` |
| `_gte` | Greater than or equal | `>= value` |
| `_lt` | Less than | `< value` |
| `_lte` | Less than or equal | `<= value` |

```typescript
// Greater than
{ price: { _gt: 100 } }
// SQL: price > 100

// Greater than or equal
{ age: { _gte: 18 } }
// SQL: age >= 18

// Less than
{ stock: { _lt: 10 } }
// SQL: stock < 10

// Less than or equal
{ priority: { _lte: 5 } }
// SQL: priority <= 5

// Range (combined)
{ price: { _gte: 10, _lte: 100 } }
// SQL: price >= 10 AND price <= 100
```

### Range

| Operator | Description | SQL Equivalent |
|----------|-------------|----------------|
| `_between` | Between two values | `BETWEEN a AND b` |

```typescript
// Between (inclusive)
{ price: { _between: [10, 50] } }
// SQL: price BETWEEN 10 AND 50

// Date range
{ createdAt: { _between: ["2024-01-01", "2024-12-31"] } }
// SQL: created_at BETWEEN '2024-01-01' AND '2024-12-31'
```

### Array Membership

| Operator | Description | SQL Equivalent |
|----------|-------------|----------------|
| `_in` | In array | `IN (values)` |
| `_notIn` | Not in array | `NOT IN (values)` |

```typescript
// In array
{ status: { _in: ["active", "pending"] } }
// SQL: status IN ('active', 'pending')

// Not in array
{ role: { _notIn: ["banned", "suspended"] } }
// SQL: role NOT IN ('banned', 'suspended')

// With IDs
{ categoryId: { _in: ["cat_1", "cat_2", "cat_3"] } }
// SQL: category_id IN ('cat_1', 'cat_2', 'cat_3')
```

### Null Checks

| Operator | Description | SQL Equivalent |
|----------|-------------|----------------|
| `_is` | Is null | `IS NULL` |
| `_isNot` | Is not null | `IS NOT NULL` |

```typescript
// Is null
{ deletedAt: { _is: null } }
// SQL: deleted_at IS NULL

// Is not null
{ email: { _isNot: null } }
// SQL: email IS NOT NULL

// Soft-delete filter pattern
{ deletedAt: { _is: null }, status: "active" }
// SQL: deleted_at IS NULL AND status = 'active'
```

## String Operators

| Operator | Description | SQL Equivalent |
|----------|-------------|----------------|
| `_contains` | Contains (case-sensitive) | `LIKE '%value%'` |
| `_containsi` | Contains (case-insensitive) | `ILIKE '%value%'` |
| `_startsWith` | Starts with | `LIKE 'value%'` |
| `_endsWith` | Ends with | `LIKE '%value'` |

```typescript
// Contains (case-sensitive)
{ name: { _contains: "John" } }
// SQL: name LIKE '%John%'

// Contains (case-insensitive)
{ name: { _containsi: "john" } }
// SQL: name ILIKE '%john%'

// Starts with
{ email: { _startsWith: "admin" } }
// SQL: email LIKE 'admin%'

// Ends with
{ email: { _endsWith: ".com" } }
// SQL: email LIKE '%.com'

// Combined string filters
{
  email: {
    _startsWith: "user",
    _endsWith: "@example.com",
  }
}
// SQL: email LIKE 'user%' AND email LIKE '%@example.com'
```

## Logical Operators

### Implicit AND

All conditions at the same level are combined with AND:

```typescript
// All conditions must match
{
  status: "active",
  role: "admin",
  verified: true,
}
// SQL: status = 'active' AND role = 'admin' AND verified = true
```

### Explicit _and

```typescript
{
  _and: [
    { status: "active" },
    { role: "admin" },
    { createdAt: { _gte: "2024-01-01" } },
  ]
}
// SQL: (status = 'active') AND (role = 'admin') AND (created_at >= '2024-01-01')
```

### _or

```typescript
// Either condition matches
{
  _or: [
    { role: "admin" },
    { role: "moderator" },
  ]
}
// SQL: (role = 'admin') OR (role = 'moderator')

// Multiple OR conditions
{
  _or: [
    { status: "active" },
    { status: "pending" },
    { priority: { _gte: 10 } },
  ]
}
// SQL: (status = 'active') OR (status = 'pending') OR (priority >= 10)
```

### _not

```typescript
// Negate condition
{ _not: { status: "deleted" } }
// SQL: NOT (status = 'deleted')

// Negate complex condition
{
  _not: {
    _or: [
      { status: "banned" },
      { status: "suspended" },
    ]
  }
}
// SQL: NOT ((status = 'banned') OR (status = 'suspended'))
```

## Combining Operators

### AND with OR

```typescript
{
  status: "active",
  _or: [
    { role: "admin" },
    { permissions: { _contains: "write" } },
  ]
}
// SQL: status = 'active' AND ((role = 'admin') OR (permissions LIKE '%write%'))
```

### Nested Conditions

```typescript
{
  _and: [
    {
      _or: [
        { type: "premium" },
        { credits: { _gte: 100 } },
      ]
    },
    {
      _or: [
        { region: "US" },
        { region: "EU" },
      ]
    },
  ]
}
// SQL: ((type = 'premium') OR (credits >= 100)) AND ((region = 'US') OR (region = 'EU'))
```

### Complex Real-World Example

```typescript
{
  // Active, non-deleted products
  status: "active",
  deletedAt: { _is: null },

  // In specific price range
  price: { _gte: 10, _lte: 1000 },

  // Either featured OR high-rated
  _or: [
    { featured: true },
    { rating: { _gte: 4.5 } },
  ],

  // Not in excluded categories
  categoryId: { _notIn: ["cat_excluded_1", "cat_excluded_2"] },

  // Has stock
  stock: { _gt: 0 },
}
```

## Filtering Nested Fields

When using joins, filter on nested paths:

```typescript
const query = createQuery(orders, {
  id: field(orders.id),
  customer: field(orders.customerId).leftJoin(customerQuery, customers.id),
});

// Filter by nested field
await query.execute(db, {
  where: {
    customer: {
      country: "US",
      verified: true,
    },
  },
});
// SQL: ... JOIN customers ON ... WHERE customers.country = 'US' AND customers.verified = true

// Combined with top-level filters
await query.execute(db, {
  where: {
    status: "completed",
    customer: { country: { _in: ["US", "CA"] } },
  },
});
```

## Type Safety

Filters are fully type-safe:

```typescript
const query = createQuery(products, {
  id: field(products.id),
  price: field(products.price),     // number
  status: field(products.status),   // string
  active: field(products.active),   // boolean
});

// Type error: price expects number
{ price: { _eq: "not a number" } } // Error!

// Type error: unknown field
{ unknownField: { _eq: "value" } } // Error!

// Type error: invalid operator for boolean
{ active: { _contains: "text" } } // Error!
```

## Related

- [[drizzle-query/index]] — Package overview
- [[drizzle-query/query-builder]] — Query builder API
- [[drizzle-query/joins]] — Filtering on joined tables
