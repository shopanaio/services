---
tags:
  - type-resolver
  - middleware
  - authorization
related:
  - type-resolver/index
  - type-resolver/executor
  - type-resolver/decorators
  - rbac
---
# Middleware

Middleware system for Executor.

## Interface

```typescript
interface Middleware<TContext> {
  name?: string;
  afterCreate?(ctx: AfterCreateContext<TContext>): Promise<void | null>;
  afterLoad?(ctx: AfterLoadContext<TContext>): Promise<void | null>;
}
```

## Hooks

| Hook | When | Can |
|------|------|-----|
| `afterCreate` | After instance created, before resolution | Return null to short-circuit |
| `afterLoad` | After all fields resolved | Mutate `ctx.result` |

## Example

```typescript
const loggingMiddleware: Middleware<ServiceContext> = {
  name: "logging",

  async afterCreate({ Type }) {
    console.log(`Creating ${Type.name}`);
  },

  async afterLoad({ Type, result }) {
    console.log(`Loaded ${Type.name}:`, result);
  },
};

const executor = createExecutor({
  middleware: [loggingMiddleware],
});
```

## Authorization Middleware

```typescript
import {
  createAuthorizationMiddleware,
  TypePolicy,
} from "@shopana/type-resolver";

@TypePolicy<StoreResolver>({
  resource: "store.profile",
  action: "read",
  organizationId: (r) => r.$props.organizationId,
  domain: (r) => `store:${r.$props.id}`,
  onDeny: "null",  // "null" | "throw"
})
class StoreResolver extends BaseResolver<Store, Store>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();
}

const executor = createExecutor({
  middleware: [createAuthorizationMiddleware()],
});
```

## Related

- [[type-resolver/index]] — Package overview
- [[type-resolver/executor]] — Executor configuration
- [[type-resolver/decorators]] — @TypePolicy decorator
- [[rbac]] — Authorization system
