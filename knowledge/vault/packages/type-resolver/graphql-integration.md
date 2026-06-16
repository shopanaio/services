---
tags:
  - type-resolver
  - graphql
  - apollo
related:
  - type-resolver/index
  - type-resolver/executor
  - type-resolver/base-type
---
# GraphQL Integration

Integration of type-resolver with GraphQL.

## parseGraphqlInfo

Converts GraphQL ResolveInfo to QueryArgs:

```typescript
import { parseGraphqlInfo } from "@shopana/type-resolver";

async products(parent, args, ctx, info) {
  const query = parseGraphqlInfo(info);
  return ProductResolver.loadMany(productIds, query, ctx);
}

// Extract nested field
async productCreate(parent, args, ctx, info) {
  const productQuery = parseGraphqlInfo(info, "product");
  return ProductResolver.load(newProductId, productQuery, ctx);
}
```

## @ApolloQuery / @ApolloMutation

Декораторы для root resolvers:

```typescript
import { ApolloQuery, ApolloMutation } from "@shopana/type-resolver";

@ApolloQuery
class QueryResolver extends BaseType<{}, {}, Context> {
  static executor = createExecutor({ middleware: [authMiddleware] });

  catalogQuery() {
    return new CatalogQueryResolver({}, this.$ctx);
  }
}

@ApolloMutation
class MutationResolver extends BaseType<{}, {}, Context> {
  static executor = createExecutor({ middleware: [authMiddleware] });

  catalogMutation() {
    return new CatalogMutationResolver({}, this.$ctx);
  }
}

const resolvers = {
  Query: QueryResolver,
  Mutation: MutationResolver,
};
```

## @SubgraphReference

Для federation entity resolvers:

```typescript
@SubgraphReference()
class ProductResolver extends CatalogType<string, Product> {
  // ...
}
```

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/executor]] — Executor class, QueryArgs format
- [[type-resolver/base-type]] — BaseType class
