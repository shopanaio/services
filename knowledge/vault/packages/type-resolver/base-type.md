---
tags:
  - type-resolver
  - base-type
related:
  - type-resolver/index
  - type-resolver/executor
  - type-resolver/middleware
---
# BaseType

Abstract base class for type resolvers.

## Generic Parameters

```typescript
class BaseType<TProps, TData = TProps, TContext = unknown>
```

| Parameter | Description |
|-----------|-------------|
| `TProps` | Input value (e.g. product ID) |
| `TData` | Data from `$preload()` |
| `TContext` | Context type |

## Properties

| Property | Description |
|----------|-------------|
| `$props` | Input value passed to constructor |
| `$ctx` | Context object |
| `$data` | Promise of loaded data (lazy) |
| `$get(key)` | Shortcut for `(await this.$data)[key]` |

## Example

```typescript
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

  async variants() {
    const ids = await this.$ctx.loaders.variantIds.load(this.$props);
    return ids.map(id => new VariantResolver(id, this.$ctx));
  }
}
```

## Static Methods

```typescript
// Load single
const result = await ProductResolver.load(productId, query, ctx);

// Load multiple
const results = await ProductResolver.loadMany(productIds, query, ctx);
```

## Static Executor

```typescript
class ProductResolver extends BaseType<string, Product, ServiceContext> {
  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });
}
```

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/executor]] — Executor class documentation
- [[type-resolver/middleware]] — Middleware system
