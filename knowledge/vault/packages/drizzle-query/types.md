---
tags:
  - drizzle-query
  - typescript
  - type-inference
  - graphql
  - codegen
related:
  - drizzle-query/index
  - drizzle-query/query-builder
  - type-resolver
---
# Type Inference & GraphQL Codegen

TypeScript type utilities and GraphQL schema generation.

## Overview

`@shopana/drizzle-query` provides comprehensive type inference from query builders, enabling:

- Full type safety for queries, filters, and results
- Automatic GraphQL input type generation
- Nested path type inference for joins

## Type Inference Utilities

### InferFields

Extract field names from a query builder:

```typescript
import type { InferFields } from "@shopana/drizzle-query";

const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  email: field(users.email),
  address: field(users.addressId).leftJoin(addressQuery, addresses.id),
});

type UserFields = InferFields<typeof usersQuery>;
// "id" | "name" | "email" | "address" | "address.street" | "address.city" | ...
```

### InferWhere

Extract where input type:

```typescript
import type { InferWhere } from "@shopana/drizzle-query";

type UserWhereInput = InferWhere<typeof usersQuery>;
// {
//   id?: string | { _eq?: string; _neq?: string; _in?: string[]; ... };
//   name?: string | { _eq?: string; _contains?: string; ... };
//   address?: {
//     city?: string | { _eq?: string; ... };
//     ...
//   };
//   _and?: UserWhereInput[];
//   _or?: UserWhereInput[];
//   _not?: UserWhereInput;
// }
```

### InferOrder

Extract order input type:

```typescript
import type { InferOrder } from "@shopana/drizzle-query";

type UserOrderInput = InferOrder<typeof usersQuery>;
// {
//   field: "id" | "name" | "email" | "address.city" | "address.country" | ...;
//   direction: "asc" | "desc";
// }
```

### InferSelect

Extract selectable fields:

```typescript
import type { InferSelect } from "@shopana/drizzle-query";

type UserSelect = InferSelect<typeof usersQuery>;
// ("id" | "name" | "email" | "address" | "address.street" | "address.city" | ...)[]
```

### InferResult

Extract query result type:

```typescript
import type { InferResult } from "@shopana/drizzle-query";

type UserResult = InferResult<typeof usersQuery>;
// {
//   id: string;
//   name: string;
//   email: string;
//   address: {
//     street: string;
//     city: string;
//     country: string;
//   } | null;
// }
```

### InferRelayInput

Extract Relay pagination input type:

```typescript
import type { InferRelayInput } from "@shopana/drizzle-query";

type ProductsQueryInput = InferRelayInput<typeof productsSchema>;
// {
//   first?: number;
//   after?: string;
//   last?: number;
//   before?: string;
//   where?: ProductWhereInput;
//   orderBy?: ProductOrderInput[];
//   select?: ProductSelect;
// }
```

## Nested Path Types

### NestedPaths

Generate all possible nested paths:

```typescript
import type { NestedPaths } from "@shopana/drizzle-query";

type OrderFields = {
  id: true;
  status: true;
  items: {
    quantity: true;
    product: {
      sku: true;
      price: true;
    };
  };
};

type Paths = NestedPaths<OrderFields>;
// "id" | "status" | "items" | "items.quantity" | "items.product" |
// "items.product.sku" | "items.product.price"
```

### FieldsDef

Define field structure for type inference:

```typescript
import type { FieldsDef } from "@shopana/drizzle-query";

// Auto-inferred from createQuery
const query = createQuery(users, {
  id: field(users.id),
  profile: field(users.profileId).leftJoin(profileQuery, profiles.id),
});

// FieldsDef is inferred as:
// {
//   id: true;
//   profile: {
//     bio: true;
//     avatar: true;
//   };
// }
```

## GraphQL Code Generation

### Generate Input Types

```typescript
import {
  generateGraphQLTypes,
  generateWhereInputType,
  generateOrderByInputType,
} from "@shopana/drizzle-query";

// Generate all types for a query
const types = generateGraphQLTypes(productsQuery, {
  typeName: "Product",
});

console.log(types);
// input ProductWhereInput {
//   id: IDFilter
//   title: StringFilter
//   price: FloatFilter
//   category: CategoryWhereInput
//   _and: [ProductWhereInput!]
//   _or: [ProductWhereInput!]
//   _not: ProductWhereInput
// }
//
// input ProductOrderByInput {
//   field: ProductOrderField!
//   direction: OrderDirection!
// }
//
// enum ProductOrderField {
//   ID
//   TITLE
//   PRICE
//   CREATED_AT
//   CATEGORY_NAME
// }
```

### Generate Where Input Only

```typescript
const whereType = generateWhereInputType(productsQuery, {
  typeName: "ProductWhereInput",
});

console.log(whereType);
// input ProductWhereInput {
//   id: IDFilter
//   title: StringFilter
//   price: FloatFilter
//   ...
// }
```

### Generate OrderBy Input Only

```typescript
const orderType = generateOrderByInputType(productsQuery, {
  typeName: "ProductOrderByInput",
  enumName: "ProductOrderField",
});

console.log(orderType);
// enum ProductOrderField {
//   ID
//   TITLE
//   PRICE
// }
//
// input ProductOrderByInput {
//   field: ProductOrderField!
//   direction: OrderDirection!
// }
```

### Filter Type Mapping

| Drizzle Type | GraphQL Filter Type |
|--------------|---------------------|
| `string` | `StringFilter` |
| `number` (int) | `IntFilter` |
| `number` (float) | `FloatFilter` |
| `boolean` | `BooleanFilter` |
| `Date` | `DateTimeFilter` |
| `uuid` | `IDFilter` |

### Built-in Filter Types

```graphql
input StringFilter {
  _eq: String
  _neq: String
  _in: [String!]
  _notIn: [String!]
  _contains: String
  _containsi: String
  _startsWith: String
  _endsWith: String
  _is: null
  _isNot: null
}

input IntFilter {
  _eq: Int
  _neq: Int
  _gt: Int
  _gte: Int
  _lt: Int
  _lte: Int
  _in: [Int!]
  _notIn: [Int!]
  _between: [Int!]
  _is: null
  _isNot: null
}

enum OrderDirection {
  ASC
  DESC
}
```

## Usage with type-resolver

Integration with `@shopana/type-resolver` for GraphQL resolvers:

```typescript
import { createQuery, field } from "@shopana/drizzle-query";
import type { InferWhere, InferOrder, InferResult } from "@shopana/drizzle-query";

// Define query
const productsQuery = createQuery(products, {
  id: field(products.id),
  title: field(products.title),
  price: field(products.price),
  category: field(products.categoryId).leftJoin(categoryQuery, categories.id),
});

// Infer types
type ProductWhere = InferWhere<typeof productsQuery>;
type ProductOrder = InferOrder<typeof productsQuery>;
type Product = InferResult<typeof productsQuery>;

// Use in resolver
@Resolver()
class ProductResolver {
  @Query()
  async products(
    @Args() args: {
      where?: ProductWhere;
      orderBy?: ProductOrder[];
      first?: number;
      after?: string;
    }
  ): Promise<ProductConnection> {
    const result = await productsPagination.query(db, {
      first: args.first,
      after: args.after,
      where: args.where,
      orderBy: args.orderBy,
    });

    return {
      edges: result.edges,
      pageInfo: result.pageInfo,
    };
  }
}
```

## Error Types

```typescript
import {
  MaxLimitExceededError,
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
} from "@shopana/drizzle-query";

// MaxLimitExceededError
interface MaxLimitExceededError extends Error {
  requested: number;
  maxLimit: number;
}

// InvalidCursorError
interface InvalidCursorError extends Error {
  cursor: string;
  expectedType: string;
}

// InvalidFieldError
interface InvalidFieldError extends Error {
  field: string;
  availableFields: string[];
}

// InvalidFilterError
interface InvalidFilterError extends Error {
  field: string;
  operator: string;
  value: unknown;
}
```

## Full Type Example

```typescript
import { createQuery, field } from "@shopana/drizzle-query";
import type {
  InferFields,
  InferWhere,
  InferOrder,
  InferSelect,
  InferResult,
  InferRelayInput,
} from "@shopana/drizzle-query";

// Define the query builder
const ordersQuery = createQuery(orders, {
  id: field(orders.id),
  status: field(orders.status),
  total: field(orders.total),
  createdAt: field(orders.createdAt),
  customer: field(orders.customerId).leftJoin(customerQuery, customers.id),
  items: field(orders.id).leftJoin(orderItemsQuery, orderItems.orderId),
});

// Infer all types
type OrderFields = InferFields<typeof ordersQuery>;
// "id" | "status" | "total" | "createdAt" | "customer" | "customer.name" | ...

type OrderWhere = InferWhere<typeof ordersQuery>;
// { id?: ...; status?: ...; customer?: { name?: ...; }; ... }

type OrderOrder = InferOrder<typeof ordersQuery>;
// { field: OrderFields; direction: "asc" | "desc"; }

type OrderSelect = InferSelect<typeof ordersQuery>;
// OrderFields[]

type OrderResult = InferResult<typeof ordersQuery>;
// { id: string; status: string; customer: { name: string; } | null; ... }

// Use types in functions
async function getOrders(
  where: OrderWhere,
  orderBy: OrderOrder[],
  select: OrderSelect
): Promise<OrderResult[]> {
  return ordersQuery.execute(db, { where, order: orderBy, select });
}
```

## Related

- [[drizzle-query/index]] — Package overview
- [[drizzle-query/query-builder]] — Query builder configuration
- [[type-resolver/index]] — GraphQL resolver framework
- [[type-resolver/drizzle-integration]] — Integration with type-resolver
