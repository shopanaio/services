---
tags:
  - drizzle-query
  - joins
  - relations
  - nested-paths
related:
  - drizzle-query/index
  - drizzle-query/query-builder
  - drizzle-query/filters
---
# Automatic Joins

Define relationships once, use nested paths everywhere.

## Overview

`@shopana/drizzle-query` supports automatic join resolution. You define relationships in the query builder, then use nested paths in `select`, `where`, and `order` — joins are added automatically.

## Defining Joins

### Basic Join

```typescript
import { createQuery, field } from "@shopana/drizzle-query";

// First, create query for the related table
const addressQuery = createQuery(addresses, {
  id: field(addresses.id),
  street: field(addresses.street),
  city: field(addresses.city),
  country: field(addresses.country),
});

// Then, define the join in the parent query
const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  email: field(users.email),
  // Join via foreign key
  address: field(users.addressId).leftJoin(addressQuery, addresses.id),
});
```

### Join Types

```typescript
// LEFT JOIN (most common) - returns row even if no match
field(users.addressId).leftJoin(addressQuery, addresses.id)
// SQL: LEFT JOIN addresses ON users.address_id = addresses.id

// INNER JOIN - only returns rows with matches
field(users.addressId).innerJoin(addressQuery, addresses.id)
// SQL: INNER JOIN addresses ON users.address_id = addresses.id

// RIGHT JOIN - returns all from right table
field(users.addressId).rightJoin(addressQuery, addresses.id)
// SQL: RIGHT JOIN addresses ON users.address_id = addresses.id

// FULL JOIN - returns all from both tables
field(users.addressId).fullJoin(addressQuery, addresses.id)
// SQL: FULL OUTER JOIN addresses ON users.address_id = addresses.id
```

### Multiple Joins

```typescript
const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  // Multiple joins
  address: field(users.addressId).leftJoin(addressQuery, addresses.id),
  organization: field(users.orgId).leftJoin(orgQuery, organizations.id),
  role: field(users.roleId).innerJoin(roleQuery, roles.id),
});
```

### Nested Joins (Multi-level)

```typescript
// Country query
const countryQuery = createQuery(countries, {
  id: field(countries.id),
  name: field(countries.name),
  code: field(countries.code),
});

// Address with country
const addressQuery = createQuery(addresses, {
  id: field(addresses.id),
  city: field(addresses.city),
  country: field(addresses.countryId).leftJoin(countryQuery, countries.id),
});

// User with address (which has country)
const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  address: field(users.addressId).leftJoin(addressQuery, addresses.id),
});

// Now you can query 3 levels deep
await usersQuery.execute(db, {
  select: ["id", "name", "address.city", "address.country.name"],
  where: { address: { country: { code: "US" } } },
});
```

## Using Nested Paths

### In Select

```typescript
const results = await usersQuery.execute(db, {
  select: [
    "id",
    "name",
    "address.street",
    "address.city",
    "address.country",
  ],
});

// Result type:
// {
//   id: string;
//   name: string;
//   address: {
//     street: string;
//     city: string;
//     country: string;
//   };
// }
```

### In Where

```typescript
// Filter by nested field
await usersQuery.execute(db, {
  where: {
    address: { country: "US" },
  },
});

// Complex nested filter
await usersQuery.execute(db, {
  where: {
    address: {
      country: { _in: ["US", "CA"] },
      city: { _containsi: "new" },
    },
  },
});

// Combined with top-level
await usersQuery.execute(db, {
  where: {
    status: "active",
    address: { country: "US" },
  },
});
```

### In Order

```typescript
// Sort by nested field
await usersQuery.execute(db, {
  order: [
    { field: "address.country", direction: "asc" },
    { field: "address.city", direction: "asc" },
    { field: "name", direction: "asc" },
  ],
});
```

## Full Example

```typescript
import { createQuery, field } from "@shopana/drizzle-query";

// Define all related queries
const categoryQuery = createQuery(categories, {
  id: field(categories.id),
  name: field(categories.name),
  slug: field(categories.slug),
});

const brandQuery = createQuery(brands, {
  id: field(brands.id),
  name: field(brands.name),
  logo: field(brands.logo),
});

const translationQuery = createQuery(translations, {
  id: field(translations.id),
  locale: field(translations.locale),
  value: field(translations.value),
});

// Main product query with joins
const productsQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  price: field(products.price),
  status: field(products.status),
  // Joins
  category: field(products.categoryId).leftJoin(categoryQuery, categories.id),
  brand: field(products.brandId).leftJoin(brandQuery, brands.id),
  title: field(products.id).leftJoin(translationQuery, translations.entityId),
})
  .defaultOrder({ field: "createdAt", direction: "desc" })
  .defaultWhere({ deletedAt: { _is: null } });

// Complex query using all features
const results = await productsQuery.execute(db, {
  select: [
    "id",
    "sku",
    "price",
    "category.name",
    "category.slug",
    "brand.name",
    "title.value",
  ],
  where: {
    status: "active",
    price: { _gte: 10, _lte: 100 },
    category: { slug: { _in: ["electronics", "accessories"] } },
    brand: { name: { _isNot: null } },
  },
  order: [
    { field: "category.name", direction: "asc" },
    { field: "price", direction: "desc" },
  ],
  limit: 20,
});
```

## Join Resolution

Joins are resolved automatically based on usage:

```typescript
// Only category join is added
await productsQuery.execute(db, {
  select: ["id", "category.name"],
});
// SQL: SELECT id, categories.name FROM products LEFT JOIN categories ON ...

// Both category and brand joins added
await productsQuery.execute(db, {
  where: { category: { slug: "electronics" } },
  order: [{ field: "brand.name", direction: "asc" }],
});
// SQL: ... LEFT JOIN categories ON ... LEFT JOIN brands ON ...
```

## One-to-Many Relationships

For one-to-many, define the join from the "many" side:

```typescript
// Order items belong to order
const orderItemsQuery = createQuery(orderItems, {
  id: field(orderItems.id),
  quantity: field(orderItems.quantity),
  price: field(orderItems.price),
  // Join to parent order
  order: field(orderItems.orderId).leftJoin(orderQuery, orders.id),
  // Join to product
  product: field(orderItems.productId).leftJoin(productQuery, products.id),
});

// Query items with order and product info
await orderItemsQuery.execute(db, {
  select: [
    "id",
    "quantity",
    "order.status",
    "product.sku",
    "product.title.value",
  ],
  where: {
    order: { status: "completed" },
  },
});
```

## Self-Referential Joins

```typescript
const categoryQuery = createQuery(categories, {
  id: field(categories.id),
  name: field(categories.name),
  // Self-reference to parent
  parent: field(categories.parentId).leftJoin(
    () => categoryQuery, // Use factory to avoid circular reference
    categories.id
  ),
});

await categoryQuery.execute(db, {
  select: ["id", "name", "parent.name"],
  where: { parent: { name: "Electronics" } },
});
```

## Type Safety

Nested paths are fully type-safe:

```typescript
// Type error: 'address' doesn't have 'foo' field
await usersQuery.execute(db, {
  select: ["address.foo"], // Error!
});

// Type error: can't filter on non-existent nested field
await usersQuery.execute(db, {
  where: { address: { nonexistent: "value" } }, // Error!
});

// Type error: can't order by non-existent path
await usersQuery.execute(db, {
  order: [{ field: "address.unknown", direction: "asc" }], // Error!
});
```

## Related

- [[drizzle-query/index]] — Package overview
- [[drizzle-query/query-builder]] — Query builder configuration
- [[drizzle-query/filters]] — Filter operators for nested fields
- [[drizzle-query/views]] — Joining tables to views
