---
tags:
  - type-resolver
  - decorators
  - cache
  - validation
related:
  - type-resolver/index
  - type-resolver/middleware
  - type-resolver/base-type
  - rbac
---
# Decorators

Decorators for type-resolver.

## @Cache

Method-level caching:

```typescript
import { Cache } from "@shopana/type-resolver";

class ProductResolver extends BaseType<string, Product, ServiceContext> {
  @Cache<ProductResolver>({
    cacheName: "product:title",
    key: (r) => r.$props,
    ttl: 60_000,  // 1 minute
  })
  async title() {
    return this.$get("title");
  }

  // Required
  protected getCache() {
    return this.$ctx.kernel.cache;
  }
}
```

## @ZodResolver

Input validation:

```typescript
import { ZodResolver } from "@shopana/type-resolver";
import { ProductCreateInputSchema } from "./generated/schemas.js";

class CatalogMutationResolver extends BaseType<{}, {}, ServiceContext> {
  @ZodResolver(ProductCreateInputSchema())
  async productCreate(args: { input: ProductCreateInput }) {
    // Input validated
    const product = await this.$ctx.services.product.create(args.input);
    return { product, userErrors: [] };
  }
}
```

## @TypePolicy

Authorization policy:

```typescript
import { TypePolicy } from "@shopana/type-resolver";

@TypePolicy<StoreResolver>({
  resource: "store.profile",
  action: "read",
  organizationId: (r) => r.$props.organizationId,
  domain: (r) => `store:${r.$props.id}`,
  onDeny: "null",
})
class StoreResolver extends BaseResolver<Store, Store> {
  // ...
}
```

### Options

| Option | Description |
|--------|-------------|
| `resource` | Resource name from rbac |
| `action` | Action (read, write, delete) |
| `organizationId` | String or function |
| `domain` | Optional domain scope |
| `onDeny` | "throw" (default) or "null" |

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/middleware]] — Middleware system
- [[type-resolver/base-type]] — BaseType class
- [[rbac]] — Authorization system integration
