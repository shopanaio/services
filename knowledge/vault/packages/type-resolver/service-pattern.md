---
tags:
  - type-resolver
  - pattern
  - service
related:
  - type-resolver/index
  - type-resolver/base-type
  - type-resolver/middleware
  - type-resolver/decorators
  - shared-graphql-guid/encoding
---
# Service Base Class Pattern

Base class pattern for services.

## Overview

Each service defines its own base resolver class:

- `CatalogType` (catalog service)
- `IAMType` (iam service)
- `InventoryType` (inventory service)
- `BaseResolver` (project service)

## Example

```typescript
// CatalogType.ts
import {
  BaseType,
  createExecutor,
  createAuthorizationMiddleware,
  type CacheStore,
  type Authorizable,
} from "@shopana/type-resolver";

export abstract class CatalogType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache;
  }
}
```

## Usage

```typescript
@SubgraphReference()
class ProductResolver extends CatalogType<string, Product> {
  async $preload() {
    const product = await this.$ctx.loaders.product.load(this.$props);
    if (!product) throw new Error(`Product not found: ${this.$props}`);
    return product;
  }

  id() {
    return encodeGlobalId(this.$props, GlobalIdEntity.Product);
  }

  async title() {
    const translation = await this.$ctx.loaders.productTranslation.load(this.$props);
    return translation?.title ?? null;
  }
}
```

## $preload Error Handling

Always throw an error in `$preload()` if the entity is not found. Never use `TData | null`:

```typescript
// ✅ Correct — throw if not found
class ProductResolver extends CatalogType<string, Product> {
  async $preload() {
    const product = await this.$ctx.loaders.product.load(this.$props);
    if (!product) throw new Error(`Product not found: ${this.$props}`);
    return product;
  }
}

// ❌ Wrong — don't use | null
class ProductResolver extends CatalogType<string, Product | null> {
  async $preload() {
    return this.$ctx.loaders.product.load(this.$props);  // may return null
  }
}
```

**Why throw instead of null:**

- Cleaner type inference — `this.$data` is always `Product`, not `Product | null`
- No null checks needed in field methods — `this.$get("title")` is safe
- Errors are caught by executor's `onError` strategy
- Use `@TypePolicy({ onDeny: "null" })` for authorization-based null returns

## With Authorization

```typescript
@TypePolicy<StoreResolver>({
  resource: "store.profile",
  action: "read",
  organizationId: (r) => r.$props.organizationId,
  domain: (r) => `store:${r.$props.id}`,
  onDeny: "null",
})
class StoreResolver extends BaseResolver<Store, Store> {
  async $preload() {
    return this.$props;
  }

  id() {
    return encodeGlobalId(this.$props.id, GlobalIdEntity.Store);
  }
}
```

## Type Inference

```typescript
import type { TypeResult, TypeContext, TypeValue } from "@shopana/type-resolver";

type ProductResult = TypeResult<typeof ProductResolver>;
type Ctx = TypeContext<typeof ProductResolver>;
type Input = TypeValue<typeof ProductResolver>;
```

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/base-type]] — BaseType class
- [[type-resolver/middleware]] — Middleware system
- [[type-resolver/decorators]] — @TypePolicy decorator
- [[shared-graphql-guid/encoding]] — Global ID encoding
