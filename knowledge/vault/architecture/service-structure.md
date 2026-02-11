---
tags:
  - architecture
  - service
  - structure
  - folder
related:
  - "[[patterns/script]]"
  - "[[patterns/resolver]]"
  - "[[patterns/repository]]"
  - "[[howto/add-feature]]"
---

# Service Structure

Each Shopana microservice follows a consistent folder structure. This document describes the standard organization.

## Folder Layout

```
services/{service-name}/
├── src/
│   ├── index.ts                    # Service entry point
│   ├── {service}.module.ts         # NestJS module definition
│   ├── {service}.nest-service.ts   # NestJS service (Kernel init)
│   │
│   ├── api/
│   │   └── graphql-admin/
│   │       ├── schema/             # GraphQL schema files (.graphql)
│   │       │   ├── base.graphql    # Common types, scalars, errors
│   │       │   ├── {entity}.graphql
│   │       │   └── __generated__/  # Generated filter types
│   │       ├── resolvers/          # Apollo resolver wiring
│   │       ├── server.ts           # Apollo Server setup
│   │       └── contextMiddleware.ts
│   │
│   ├── resolvers/
│   │   └── admin/
│   │       ├── index.ts            # Export all resolvers
│   │       ├── {Entity}Type.ts     # Base type (extends InventoryType)
│   │       ├── QueryResolver.ts    # Root Query resolver
│   │       ├── MutationResolver.ts # Root Mutation resolver
│   │       ├── {Entity}Resolver.ts # Entity type resolver
│   │       ├── {Entity}ConnectionResolver.ts
│   │       ├── {Entity}FederationResolver.ts
│   │       └── generated/
│   │           ├── types.ts        # TS types from GraphQL
│   │           └── schemas.ts      # Zod schemas from GraphQL
│   │
│   ├── scripts/
│   │   ├── index.ts                # Export all scripts
│   │   └── {entity}/
│   │       ├── index.ts
│   │       ├── {Entity}CreateScript.ts
│   │       ├── {Entity}UpdateScript.ts
│   │       └── {Entity}DeleteScript.ts
│   │
│   ├── loaders/
│   │   ├── Loader.ts               # Aggregator of all loaders
│   │   ├── {Entity}Loader.ts       # DataLoader for entity
│   │   └── ...
│   │
│   ├── repositories/
│   │   ├── Repository.ts           # Aggregator of all repositories
│   │   ├── BaseRepository.ts       # Base class with connection/context
│   │   ├── models/
│   │   │   ├── index.ts            # Export all models
│   │   │   ├── schema.ts           # Drizzle schema definition
│   │   │   └── {entity}.ts         # Table definitions
│   │   └── {entity}/
│   │       └── {Entity}Repository.ts
│   │
│   ├── kernel/
│   │   ├── Kernel.ts               # Service kernel (singleton)
│   │   ├── BaseScript.ts           # Base class for scripts
│   │   ├── Authorizable.ts         # AuthProvider implementation
│   │   └── types.ts                # Kernel service types
│   │
│   ├── context/
│   │   ├── index.ts                # Context exports
│   │   ├── types.ts                # ServiceContext class
│   │   └── contextStorage.ts       # AsyncLocalStorage
│   │
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── database.ts         # Database type definition
│   │   │   └── migrate.ts          # Migration runner
│   │   └── plugins/                # Optional plugins
│   │
│   ├── {Service}BrokerActions.ts   # NestJS broker actions
│   └── {Service}EventHandlers.ts   # Event handlers
│
├── drizzle/                        # Generated migrations
│   └── NNNN_migration.sql
├── drizzle.config.ts               # Drizzle Kit config
├── package.json
└── tsconfig.json
```

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

## Data Flow

```
GraphQL Request
      │
      ▼
┌─────────────────┐
│ Context         │ ← Creates ServiceContext with loaders
│ Middleware      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QueryResolver   │ ← Entry point (@ApolloQuery)
│ MutationResolver│ ← Entry point (@ApolloMutation)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EntityResolver  │ ← Type resolution (extends BaseType)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│Loader │ │ Script │ ← For mutations
└───┬───┘ └────┬───┘
    │          │
    ▼          ▼
┌─────────────────┐
│  Repository     │ ← Data access layer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │ ← Drizzle ORM
└─────────────────┘
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
