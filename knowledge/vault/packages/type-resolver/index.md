---
tags:
  - package
  - type-resolver
  - graphql
related:
  - drizzle-query
  - graphql-federation
  - rbac
---
# @shopana/type-resolver

Recursive data resolution library using TypeScript classes as types.

## Overview

Define data types as classes where each method is a resolver. Combined with `@shopana/drizzle-query`, it creates a powerful pattern: drizzle-query for SQL, type-resolver for recursive field resolution with authorization and caching.

## Features

- **Class-based resolvers** — types as classes with methods
- **Recursive resolution** — automatic resolution of nested BaseType
- **Lazy loading** — `$preload()` called only when needed
- **Middleware** — authorization, logging, transformation
- **GraphQL integration** — `parseGraphqlInfo()` converts GraphQL info
- **Caching** — `@Cache` for method caching
- **Validation** — `@ZodResolver` for input validation
- **Authorization** — `@TypePolicy` for RBAC

## Quick Example

```typescript
import { BaseType, parseGraphqlInfo } from "@shopana/type-resolver";

class ProductResolver extends BaseType<string, Product, ServiceContext> {
  protected async $preload() {
    const product = await this.$ctx.loaders.product.load(this.$props);
    if (!product) throw new Error(`Product not found: ${this.$props}`);
    return product;
  }

  id() {
    return this.$props;
  }

  async title() {
    return this.$get("title");
  }
}

// GraphQL resolver
async products(parent, args, ctx, info) {
  const query = parseGraphqlInfo(info);
  return ProductResolver.loadMany(productIds, query, ctx);
}
```

## Documentation

| Topic | Description |
|-------|-------------|
| [[base-type]] | BaseType class, properties, methods |
| [[executor]] | Executor class, QueryArgs format |
| [[graphql-integration]] | parseGraphqlInfo, @ApolloQuery |
| [[middleware]] | Middleware system, authorization |
| [[decorators]] | @Cache, @ZodResolver, @TypePolicy |
| [[drizzle-integration]] | Integration with drizzle-query |
| [[service-pattern]] | Service base class pattern |

## Related

- [[drizzle-query]] — Query builder for repositories
- [[graphql-federation]] — GraphQL layer
- [[rbac]] — Authorization system
