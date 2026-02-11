---
tags:
  - type-resolver
  - drizzle-query
  - integration
related:
  - type-resolver/index
  - type-resolver/base-type
  - type-resolver/executor
  - drizzle-query/index
  - drizzle-query/cursor-pagination
---
# Drizzle Query Integration

Integration of type-resolver with drizzle-query.

## Architecture

```
GraphQL Resolver (parseGraphqlInfo → QueryArgs)
         │
         ▼
type-resolver (BaseType → field resolution)
         │
         ▼
Repository Layer (uses drizzle-query)
         │
         ▼
drizzle-query (SQL generation, pagination)
         │
         ▼
Drizzle ORM / PostgreSQL
```

## Repository

```typescript
import { createQuery, createRelayQuery } from "@shopana/drizzle-query";

const productRelayQuery = createRelayQuery(
  createQuery(product).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "product", tieBreaker: "id" }
);

export class ProductRepository {
  async getConnection(args: ProductRelayInput) {
    return productRelayQuery.execute(this.connection, args);
  }
}
```

## Connection Resolver

```typescript
class ProductConnectionResolver extends BaseType<ProductRelayInput, ConnectionData, ServiceContext> {
  async $preload() {
    return this.$ctx.services.product.getConnection(this.$props);
  }

  async edges() {
    const data = await this.$data;
    return data.edges.map((edge) => ({
      cursor: edge.cursor,
      node: new ProductResolver(edge.nodeId, this.$ctx),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount() {
    return this.$get("totalCount");
  }
}
```

## Data Flow

1. GraphQL query arrives
2. `parseGraphqlInfo()` → QueryArgs
3. Root resolver creates ConnectionResolver
4. `$preload()` → Repository → drizzle-query → SQL
5. `edges()` creates ProductResolver instances
6. Each product resolved with DataLoader

## Responsibility Split

| Concern | drizzle-query | type-resolver |
|---------|--------------|---------------|
| SQL generation | ✅ | - |
| Filtering/sorting | ✅ | - |
| Cursor pagination | ✅ | - |
| Field selection | ✅ (DB) | ✅ (resolver) |
| Authorization | - | ✅ |
| Caching | - | ✅ |
| DataLoader | - | ✅ |

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/base-type]] — BaseType class
- [[type-resolver/executor]] — Executor class
- [[drizzle-query/index]] — Query builder package
- [[drizzle-query/cursor-pagination]] — Relay-style pagination
