---
tags:
  - howto
  - guide
  - feature
  - workflow
related:
  - "[[architecture/service-structure]]"
  - "[[patterns/script]]"
  - "[[patterns/resolver]]"
  - "[[patterns/repository]]"
  - "[[patterns/dataloader]]"
---

# How to Add a New Feature

Step-by-step guide for adding a new entity/feature to a Shopana service.

## Overview

```
1. Drizzle Schema    →  Define tables
2. DB Migration      →  Generate & apply migration
3. GraphQL Schema    →  Define types, inputs, payloads
4. Codegen           →  Generate TS types & Zod schemas
5. Repository        →  Data access layer
6. DataLoader        →  Batch loading (optional)
7. Script            →  Business logic for mutations
8. Resolver          →  GraphQL type resolution
9. Wiring            →  Connect to query/mutation roots
10. Test             →  Write e2e tests
```

## Step 1: Drizzle Schema

Create or update table definition in `repositories/models/`:

```typescript
// repositories/models/warehouse.ts

import {
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";

export const warehouses = inventorySchema.table(
  "warehouses",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("warehouses_project_id_code_key").on(table.projectId, table.code),
  ]
);

// Type inference
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
```

Export from `models/index.ts`:

```typescript
export * from "./warehouse.js";
```

## Step 2: Database Migration

Generate and apply migration:

```bash
# Generate migration
shopana db:generate --service inventory

# Apply migration
shopana migrate --service inventory
```

## Step 3: GraphQL Schema

Create schema file in `api/graphql-admin/schema/`:

```graphql
# api/graphql-admin/schema/warehouse.graphql

"""
A warehouse represents a physical location where inventory is stored.
"""
type Warehouse implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """Unique code."""
  code: String!

  """Display name."""
  name: String!

  """Whether this is the default warehouse."""
  isDefault: Boolean!

  """Creation timestamp."""
  createdAt: DateTime!

  """Last update timestamp."""
  updatedAt: DateTime!
}

# ---- Connection ----

type WarehouseConnection {
  edges: [WarehouseEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type WarehouseEdge {
  node: Warehouse!
  cursor: String!
}

# ---- Inputs ----

input WarehouseCreateInput {
  code: String!
  name: String!
  isDefault: Boolean
}

input WarehouseUpdateInput {
  id: ID!
  code: String
  name: String
  isDefault: Boolean
}

input WarehouseDeleteInput {
  id: ID!
}

# ---- Payloads ----

type WarehouseCreatePayload {
  warehouse: Warehouse
  userErrors: [GenericUserError!]!
}

type WarehouseUpdatePayload {
  warehouse: Warehouse
  userErrors: [GenericUserError!]!
}

type WarehouseDeletePayload {
  deletedWarehouseId: ID
  userErrors: [GenericUserError!]!
}
```

Add to Query/Mutation types:

```graphql
# In base.graphql or appropriate file

extend type Query {
  """Get warehouse by ID."""
  warehouse(id: ID!): Warehouse

  """List warehouses."""
  warehouses(
    first: Int
    after: String
    last: Int
    before: String
  ): WarehouseConnection!
}

extend type InventoryMutation {
  warehouseCreate(input: WarehouseCreateInput!): WarehouseCreatePayload!
  warehouseUpdate(input: WarehouseUpdateInput!): WarehouseUpdatePayload!
  warehouseDelete(input: WarehouseDeleteInput!): WarehouseDeletePayload!
}
```

## Step 4: Code Generation

Generate TypeScript types and Zod schemas:

```bash
shopana codegen --service inventory
```

This generates:
- `resolvers/admin/generated/types.ts` — TypeScript types
- `resolvers/admin/generated/schemas.ts` — Zod validation schemas

## Step 5: Repository

Create repository in `repositories/warehouse/`:

```typescript
// repositories/warehouse/WarehouseRepository.ts

import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { BaseRepository } from "../BaseRepository.js";
import { warehouses, type Warehouse, type NewWarehouse } from "../models/index.js";

export class WarehouseRepository extends BaseRepository {
  // CRUD
  async findById(id: string): Promise<Warehouse | null> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(and(
        eq(warehouses.projectId, this.storeId),
        eq(warehouses.id, id)
      ))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: { code: string; name: string; isDefault?: boolean }): Promise<Warehouse> {
    const id = uuidv7();
    const now = new Date().toISOString();

    const result = await this.connection
      .insert(warehouses)
      .values({
        projectId: this.storeId,
        id,
        ...data,
        isDefault: data.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  }

  async update(id: string, data: Partial<{ code: string; name: string; isDefault: boolean }>): Promise<Warehouse | null> {
    const result = await this.connection
      .update(warehouses)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(
        eq(warehouses.projectId, this.storeId),
        eq(warehouses.id, id)
      ))
      .returning();
    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(warehouses)
      .where(and(
        eq(warehouses.projectId, this.storeId),
        eq(warehouses.id, id)
      ))
      .returning({ id: warehouses.id });
    return result.length > 0;
  }

  // DataLoader support
  async getByIds(ids: readonly string[]): Promise<Warehouse[]> {
    return this.connection
      .select()
      .from(warehouses)
      .where(and(
        eq(warehouses.projectId, this.storeId),
        inArray(warehouses.id, [...ids])
      ));
  }

  // Business logic
  async findByCode(code: string): Promise<Warehouse | null> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(and(
        eq(warehouses.projectId, this.storeId),
        eq(warehouses.code, code)
      ))
      .limit(1);
    return result[0] ?? null;
  }
}
```

Register in `Repository.ts`:

```typescript
// repositories/Repository.ts

import { WarehouseRepository } from "./warehouse/WarehouseRepository.js";

export class Repository {
  public readonly warehouse: WarehouseRepository;

  static async create(config: { db: Database }): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    const warehouse = new WarehouseRepository(config.db, txManager);
    // ...
  }
}
```

## Step 6: DataLoader (Optional)

Create loader in `loaders/`:

```typescript
// loaders/WarehouseLoader.ts

import DataLoader from "dataloader";
import type { Warehouse } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class WarehouseLoader {
  public readonly warehouse: DataLoader<string, Warehouse | null>;

  constructor(repository: Repository) {
    this.warehouse = new DataLoader<string, Warehouse | null>(
      async (ids) => {
        const results = await repository.warehouse.getByIds(ids);
        return ids.map((id) => results.find((w) => w.id === id) ?? null);
      }
    );
  }
}
```

Register in `Loader.ts`:

```typescript
// loaders/Loader.ts

import { WarehouseLoader } from "./WarehouseLoader.js";

export class Loader {
  public readonly warehouse: DataLoader<string, Warehouse | null>;

  constructor(repository: Repository) {
    const warehouseLoader = new WarehouseLoader(repository);
    this.warehouse = warehouseLoader.warehouse;
  }
}
```

## Step 7: Scripts

Create scripts in `scripts/warehouse/`:

```typescript
// scripts/warehouse/WarehouseCreateScript.ts

import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Warehouse } from "../../repositories/models/index.js";

export interface WarehouseCreateParams {
  readonly code: string;
  readonly name: string;
  readonly isDefault?: boolean;
}

export interface WarehouseCreateResult {
  warehouse?: Warehouse;
  userErrors: UserError[];
}

export class WarehouseCreateScript extends BaseScript<
  WarehouseCreateParams,
  WarehouseCreateResult
> {
  protected async execute(params: WarehouseCreateParams): Promise<WarehouseCreateResult> {
    // Validate
    const existing = await this.repository.warehouse.findByCode(params.code);
    if (existing) {
      return {
        warehouse: undefined,
        userErrors: [{
          message: `Code "${params.code}" already exists`,
          field: ["code"],
          code: "CODE_EXISTS"
        }],
      };
    }

    // Create
    const warehouse = await this.repository.warehouse.create(params);

    this.logger.info({ warehouseId: warehouse.id }, "Warehouse created");

    return { warehouse, userErrors: [] };
  }

  protected handleError(_error: unknown): WarehouseCreateResult {
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
```

Export from `scripts/warehouse/index.ts` and `scripts/index.ts`.

## Step 8: Resolver

Create resolver in `resolvers/admin/`:

```typescript
// resolvers/admin/WarehouseResolver.ts

import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { InventoryType } from "./InventoryType.js";
import type { Warehouse } from "../../repositories/models/index.js";

export class WarehouseResolver extends InventoryType<string, Warehouse | null> {
  async $preload() {
    return this.$ctx.loaders.warehouse.load(this.$props);
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Warehouse);
  }

  code() { return this.$data!.code; }
  name() { return this.$data!.name; }
  isDefault() { return this.$data!.isDefault; }
  createdAt() { return this.$data!.createdAt; }
  updatedAt() { return this.$data!.updatedAt; }
}
```

## Step 9: Wiring

Add to QueryResolver:

```typescript
// resolvers/admin/QueryResolver.ts

@ApolloQuery
export class QueryResolver extends InventoryType<Record<string, never>> {
  async warehouse(args: { id: string }) {
    const id = decodeGlobalIdByType(args.id, GlobalIdEntity.Warehouse);
    const warehouse = await this.$ctx.loaders.warehouse.load(id);
    if (!warehouse) return null;
    return new WarehouseResolver(warehouse.id, this.$ctx);
  }

  warehouses(args: WarehousesArgs) {
    return new WarehouseConnectionResolver(args, this.$ctx);
  }
}
```

Add to MutationResolver:

```typescript
// resolvers/admin/MutationResolver.ts

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
}
```

## Step 10: Test

Create e2e test in `e2e/tests/`:

```typescript
// e2e/tests/inventory-api/warehouse-create.spec.ts

import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Warehouse Create', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should create warehouse', async ({ api }) => {
    const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH001',
          name: 'Main Warehouse',
          isDefault: true,
        },
      },
    });

    expect(data.inventoryMutation.warehouseCreate.userErrors).toHaveLength(0);
    expect(data.inventoryMutation.warehouseCreate.warehouse).toBeTruthy();
    expect(data.inventoryMutation.warehouseCreate.warehouse.code).toBe('WH001');
  });

  test('should return error for duplicate code', async ({ api }) => {
    // Create first
    await api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: { input: { code: 'WH001', name: 'First' } },
    });

    // Try duplicate
    const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: { input: { code: 'WH001', name: 'Second' } },
    });

    expect(data.inventoryMutation.warehouseCreate.userErrors).toHaveLength(1);
    expect(data.inventoryMutation.warehouseCreate.userErrors[0].code).toBe('CODE_EXISTS');
  });
});
```

Run test:

```bash
cd e2e && yarn playwright test tests/inventory-api/warehouse-create.spec.ts --workers 1
```

## Checklist

- [ ] Drizzle schema created
- [ ] Migration generated and applied
- [ ] GraphQL schema defined
- [ ] Codegen run
- [ ] Repository created and registered
- [ ] DataLoader created (if needed)
- [ ] Scripts created for mutations
- [ ] Resolver created
- [ ] Wired to Query/Mutation
- [ ] E2E tests written and passing

## See Also

- [[architecture/service-structure]] — Service folder layout
- [[patterns/script]] — Script pattern
- [[patterns/resolver]] — Resolver pattern
- [[patterns/repository]] — Repository pattern
- [[patterns/dataloader]] — DataLoader pattern
