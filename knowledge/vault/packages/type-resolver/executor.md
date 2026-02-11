---
tags:
  - type-resolver
  - executor
  - query-args
related:
  - type-resolver/index
  - type-resolver/base-type
  - type-resolver/middleware
  - type-resolver/graphql-integration
---
# Executor

Class for recursive resolution of BaseType instances.

## Creation

```typescript
import { createExecutor } from "@shopana/type-resolver";

const executor = createExecutor<ServiceContext>({
  onError: "throw",  // "throw" | "null" | "partial"
  middleware: [authMiddleware],
});
```

### ExecutorOptions

| Option | Type | Description |
|--------|------|-------------|
| `onError` | `"throw" \| "null" \| "partial"` | Error handling strategy (default: "throw") |
| `ctx` | `TContext` | Context passed to all instances via `this.$ctx` |
| `middleware` | `Middleware<TContext>[]` | Array of middleware handlers |

## Methods

```typescript
// Single instance
const result = await executor.load(instance, query);

// Multiple instances (parallel)
const results = await executor.loadMany(instances, query);

// Universal (BaseType, arrays, objects, scalars)
const data = await executor.resolve(value, query);
```

### load()

Resolves a single BaseType instance:

1. Runs `afterCreate` middleware (can short-circuit with `null`)
2. Collects fields from `query.fields` and `query.populate`
3. Resolves all fields **in parallel** via `Promise.all()`
4. Recursively resolves nested BaseType instances
5. Runs `afterLoad` middleware (can mutate result)
6. Returns resolved object

### loadMany()

Maps over instances array, calls `load()` on each with the same query. Returns array of results (preserves order).

### resolve()

Universal resolver that handles any value type:

| Value Type | Behavior |
|------------|----------|
| `BaseType` | Calls `load(value, query)` |
| `Array<BaseType>` | Calls `loadMany(value, query)` |
| `Array<objects>` | Recursively resolves each element |
| `Array<scalars>` | Returns as-is |
| Plain object | Resolves specified fields recursively |
| Scalar / Date | Returns as-is |

## QueryArgs Format

```typescript
type QueryArgs<TArgs = unknown> = {
  fields?: string[];           // Scalar field names
  populate?: {                 // Relation fields with nesting
    [fieldName: string]: QueryArgs & {
      args?: TArgs;            // Arguments for resolver method
      fieldName?: string;      // Alias support (call different method)
    };
  };
};
```

## Example

```typescript
const query: QueryArgs = {
  fields: ["id", "title"],
  populate: {
    variants: {
      args: { first: 10 },
      fields: ["id", "sku"],
      populate: {
        options: { fields: ["id", "name"] }
      }
    }
  }
};
```

## Alias Support

Use `fieldName` to call a different method than the query key:

```typescript
const query: QueryArgs = {
  populate: {
    topVariants: {
      fieldName: "variants",  // Calls variants() method
      args: { first: 5 },
      fields: ["sku"]
    },
    allVariants: {
      fieldName: "variants",  // Same method, different args
      args: { first: 100 },
      fields: ["id", "sku", "price"]
    }
  }
};
```

## Argument Passing

Arguments passed via `args` are forwarded to the resolver method:

```typescript
class ProductResolver extends BaseType<string, Product, ServiceContext> {
  async variants(args: { first?: number; where?: VariantFilter }) {
    const ids = await this.$ctx.loaders.variantIds.load({
      productId: this.$props,
      ...args,
    });
    return ids.map(id => new VariantResolver(id, this.$ctx));
  }
}

// Query
const query = {
  populate: {
    variants: {
      args: { first: 10, where: { isPublished: true } },
      fields: ["id", "sku"]
    }
  }
};
```

## Error Handling

| Option | Behavior | Use Case |
|--------|----------|----------|
| `throw` | Wraps errors in `ResolverError` with field/type context | Strict mode, fail-fast |
| `null` | Returns `null` for failed fields | Partial data acceptable |
| `partial` | Returns `{ __error: message }` | Client-side error reporting |

### ResolverError

```typescript
class ResolverError extends Error {
  readonly field: string;         // Field that failed
  readonly type: string;          // Type name where error occurred
  readonly originalError?: unknown;
}
```

Errors are caught per-field — other fields continue resolving even if one fails.

## Static Executor on BaseType

```typescript
class ProductResolver extends BaseType<string, Product, ServiceContext> {
  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });
}

// Static methods use the executor
const result = await ProductResolver.load(productId, query, ctx);
const results = await ProductResolver.loadMany(productIds, query, ctx);
```

## Resolution Flow

```
GraphQL Resolver
       │
       ▼
ProductResolver.load(id, query, ctx)
       │
       ▼
┌──────────────────────────────────┐
│  1. Create instance              │
│  2. afterCreate middleware       │ ← can return null to short-circuit
│  3. Resolve fields (parallel)    │
│     ├─ scalar fields             │
│     └─ relations → recursive     │
│  4. afterLoad middleware         │ ← can mutate result
│  5. Return result                │
└──────────────────────────────────┘
```

## Parallel Resolution

Fields at the same level resolve in parallel:

```typescript
// These resolve simultaneously
const query = {
  fields: ["id", "title", "description", "price"],
  populate: {
    variants: { fields: ["sku"] },      // parallel with...
    category: { fields: ["name"] },     // ...this one
  }
};
```

Nested levels resolve sequentially (each level waits for parent).

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/base-type]] — BaseType class documentation
- [[type-resolver/middleware]] — Middleware system
- [[type-resolver/graphql-integration]] — parseGraphqlInfo for QueryArgs
