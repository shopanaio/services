---
tags:
  - pattern
  - resolver
  - graphql
  - type-resolver
related:
  - type-resolver/index
  - patterns/script
  - patterns/dataloader
  - patterns/federation
---

# Resolver Pattern

Resolvers handle GraphQL type resolution using class-based approach from `@shopana/type-resolver`.

## Overview

| Concept | Description |
|---------|-------------|
| Base Class | `BaseType<TValue, TData, TContext>` |
| Service Base | `{Service}Type<TValue, TData>` (extends BaseType) |
| Entry Points | `@ApolloQuery`, `@ApolloMutation` decorators |
| Context | `ServiceContext` with kernel, loaders, user, store |

## Service Base Type

Each service defines its own base type that extends `BaseType`:

```typescript
// resolvers/admin/InventoryType.ts

import {
  BaseType,
  Cache,
  createExecutor,
  createAuthorizationMiddleware,
  type Authorizable,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";

export abstract class InventoryType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });
}
```

## Root Query Resolver

Entry point for queries:

```typescript
// resolvers/admin/QueryResolver.ts

import { ApolloQuery } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { WarehouseConnectionResolver } from "./WarehouseConnectionResolver.js";

@ApolloQuery
export class QueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Get warehouse by ID.
   */
  async warehouse(args: { id: string }) {
    const warehouseId = decodeGlobalIdByType(args.id, GlobalIdEntity.Warehouse);
    const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
    if (!warehouse) return null;
    return new WarehouseResolver(warehouse.id, this.$ctx);
  }

  /**
   * Get paginated list of warehouses.
   */
  warehouses(args: WarehousesQueryArgs) {
    return new WarehouseConnectionResolver(args, this.$ctx);
  }
}
```

## Root Mutation Resolver

Entry point for mutations with namespace pattern:

```typescript
// resolvers/admin/MutationResolver.ts

import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";

@ApolloMutation
export class MutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Namespace entry point for inventory mutations.
   */
  inventoryMutation() {
    return new InventoryMutationResolver({}, this.$ctx);
  }
}

/**
 * Namespace resolver for inventory mutations.
 */
export class InventoryMutationResolver extends InventoryType<Record<string, never>> {
  @ZodResolver(WarehouseCreateInputSchema())
  async warehouseCreate(args: { input: WarehouseCreateInput }) {
    const result = await this.$ctx.kernel.runScript(WarehouseCreateScript, {
      code: args.input.code,
      name: args.input.name,
      isDefault: args.input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(WarehouseDeleteInputSchema())
  async warehouseDelete(args: { input: WarehouseDeleteInput }) {
    const result = await this.$ctx.kernel.runScript(WarehouseDeleteScript, {
      id: args.input.id,
    });

    return {
      deletedWarehouseId: result.deletedWarehouseId ?? null,
      userErrors: result.userErrors,
    };
  }
}
```

## Entity Resolver

Resolves fields for a GraphQL type:

```typescript
// resolvers/admin/WarehouseResolver.ts

import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { InventoryType, Cache } from "./InventoryType.js";
import { StockConnectionResolver } from "./StockConnectionResolver.js";
import type { Warehouse } from "../../repositories/models/index.js";

export class WarehouseResolver extends InventoryType<string, Warehouse | null> {
  /**
   * Load warehouse data (called automatically when fields are accessed).
   */
  async $preload() {
    return this.$ctx.loaders.warehouse.load(this.$props);
  }

  /**
   * Encode ID for GraphQL response.
   */
  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Warehouse);
  }

  /**
   * Simple field - return from loaded data.
   */
  code() {
    return this.$data!.code;
  }

  name() {
    return this.$data!.name;
  }

  isDefault() {
    return this.$data!.isDefault;
  }

  createdAt() {
    return this.$data!.createdAt;
  }

  updatedAt() {
    return this.$data!.updatedAt;
  }

  /**
   * Relation - return another resolver.
   */
  stock(args: StockConnectionArgs) {
    return new StockConnectionResolver(
      { warehouseId: this.$props, ...args },
      this.$ctx
    );
  }

  /**
   * Computed field.
   */
  @Cache({ ttl: 60 })
  async variantsCount() {
    return this.$ctx.kernel.repository.stock.countByWarehouse(this.$props);
  }
}
```

## Connection Resolver

For Relay-style pagination:

```typescript
// resolvers/admin/WarehouseConnectionResolver.ts

import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import type { WarehouseRelayInput } from "../../repositories/warehouse/WarehouseRepository.js";

export class WarehouseConnectionResolver extends InventoryType<WarehouseRelayInput> {
  async edges() {
    const result = await this.$ctx.kernel.repository.warehouse.getConnection(this.$props);
    return result.edges.map((edge) => ({
      cursor: edge.cursor,
      node: new WarehouseResolver(edge.nodeId, this.$ctx),
    }));
  }

  async pageInfo() {
    const result = await this.$ctx.kernel.repository.warehouse.getConnection(this.$props);
    return result.pageInfo;
  }

  async totalCount() {
    const result = await this.$ctx.kernel.repository.warehouse.getConnection(this.$props);
    return result.totalCount;
  }
}
```

## Resolver Class Properties

| Property | Description |
|----------|-------------|
| `$props` | Value passed to constructor (usually entity ID) |
| `$data` | Loaded data from `$preload()` |
| `$ctx` | ServiceContext (kernel, loaders, user, store) |

## Decorators

### @ApolloQuery / @ApolloMutation

Mark root resolver for Apollo integration:

```typescript
@ApolloQuery
export class QueryResolver extends InventoryType<Record<string, never>> { }

@ApolloMutation
export class MutationResolver extends InventoryType<Record<string, never>> { }
```

### @ZodResolver

Validate input arguments:

```typescript
@ZodResolver(WarehouseCreateInputSchema())
async warehouseCreate(args: { input: WarehouseCreateInput }) {
  // args.input is validated
}
```

### @Cache

Cache method results:

```typescript
@Cache({ ttl: 60 })  // Cache for 60 seconds
async expensiveComputation() {
  return this.$ctx.kernel.repository.doExpensiveThing();
}
```

### @TypePolicy

Authorization policy for the type:

```typescript
@TypePolicy<ProductResolver>({
  resource: "product",
  action: "read",
  organizationId: (r) => r.$ctx.store.organizationId,
  domain: (r) => `store:${r.$ctx.store.id}`,
  onDeny: "null",  // Return null instead of throwing
})
export class ProductResolver extends InventoryType<string, Product | null> { }
```

## Accessing Context

```typescript
class MyResolver extends InventoryType<string> {
  async someField() {
    // Access kernel
    const data = await this.$ctx.kernel.repository.entity.find();

    // Access loaders
    const related = await this.$ctx.loaders.relatedEntity.load(this.$props);

    // Access user
    if (this.$ctx.hasUser) {
      const userId = this.$ctx.user.id;
    }

    // Access store
    const storeId = this.$ctx.store.id;
    const orgId = this.$ctx.store.organizationId;

    // Access locale/currency
    const locale = this.$ctx.locale ?? "uk";
    const currency = this.$ctx.currency ?? "UAH";
  }
}
```

## Returning Other Resolvers

Always return resolver instances for related types:

```typescript
// Good: Return resolver
async warehouse() {
  const warehouse = await this.$ctx.loaders.warehouse.load(this.$data!.warehouseId);
  if (!warehouse) return null;
  return new WarehouseResolver(warehouse.id, this.$ctx);
}

// Bad: Return data directly
async warehouse() {
  return this.$ctx.loaders.warehouse.load(this.$data!.warehouseId);
}
```

## See Also

- [[type-resolver/index]] — Type resolver package
- [[type-resolver/base-type]] — BaseType class
- [[type-resolver/decorators]] — Resolver decorators
- [[patterns/script]] — Script pattern for mutations
- [[patterns/dataloader]] — DataLoader pattern
- [[patterns/federation]] — Federation resolvers
