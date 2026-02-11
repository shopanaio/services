---
tags:
  - architecture
  - service
  - structure
  - folder
related:
  - patterns/script
  - patterns/resolver
  - patterns/repository
  - howto/add-feature
---

# Service Structure

Each Shopana microservice follows a consistent folder structure. This document describes the standard organization.

## Key Components

### Module (`{service}.module.ts`)

NestJS module that registers all providers:

```typescript
@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'inventory' })],
  providers: [
    InventoryBrokerActions,
    InventoryNestService,
    InventoryEventHandlers,
  ],
})
export class InventoryModule {}
```

### Kernel (`kernel/Kernel.ts`)

Singleton that holds all service dependencies:

```typescript
export class Kernel extends BaseKernel<InventoryKernelServices> {
  public repository!: Repository;
  public cache!: Cache;
  public db!: Database;
  public workflow!: WorkflowRegistry;

  async runScript<TParams, TResult>(
    ScriptClass: new (services: InventoryKernelServices) => BaseScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult>;
}
```

### Context (`context/types.ts`)

Request-scoped context passed through resolvers:

```typescript
class ServiceContext {
  readonly requestId: string;
  readonly kernel: Kernel;
  readonly loaders: Loader;
  readonly locale?: string;
  readonly currency?: string;

  get store(): ContextStore;
  get user(): ContextUser;
  get hasStore(): boolean;
  get hasUser(): boolean;
}
```

## Generated Code

| File | Source | Command |
|------|--------|---------|
| `resolvers/admin/generated/types.ts` | GraphQL schema | `shopana codegen` |
| `resolvers/admin/generated/schemas.ts` | GraphQL schema | `shopana codegen` |
| `api/graphql-admin/schema/__generated__/filters.graphql` | Drizzle schema | Custom script |
| `drizzle/*.sql` | Drizzle schema | `shopana db:generate` |

## See Also

- [[patterns/script]] — BaseScript pattern
- [[patterns/resolver]] — Resolver patterns
- [[patterns/repository]] — Repository pattern
- [[patterns/dataloader]] — DataLoader pattern
- [[howto/add-feature]] — Step-by-step guide
