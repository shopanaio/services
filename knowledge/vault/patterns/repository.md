---
tags:
  - pattern
  - repository
  - database
  - drizzle
related:
  - drizzle-query/index
  - patterns/dataloader
  - architecture/service-structure
---

# Repository Pattern

Repositories provide data access layer with automatic transaction and multi-tenant support.

## Overview

| Aspect | Description |
|--------|-------------|
| ORM | Drizzle ORM |
| Base Class | `BaseRepository` |
| Aggregator | `Repository` class |
| Transactions | Via `TransactionManager` |
| Multi-tenancy | Auto-filtered by `projectId` (storeId) |

## BaseRepository

Base class providing connection and context access:

```typescript
// repositories/BaseRepository.ts

import type { TransactionManager } from "@shopana/shared-kernel";
import { getContext, type ServiceContext } from "../context/index.js";
import type { Database } from "../infrastructure/db/database";

export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>
  ) {}

  /**
   * Get active connection (transaction if in tx, otherwise db).
   * ALL queries should use this getter instead of this.db
   */
  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  /**
   * Get current service context from async local storage.
   */
  protected get ctx(): ServiceContext {
    return getContext();
  }

  /**
   * Get storeId from context (for multi-tenancy).
   */
  protected get storeId(): string {
    return this.ctx.store.id;
  }
}
```

## Entity Repository

Example repository implementation:

```typescript
// repositories/warehouse/WarehouseRepository.ts

import { and, eq, inArray, count } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { BaseRepository } from "../BaseRepository.js";
import { warehouses, type Warehouse, type NewWarehouse } from "../models/index.js";

export class WarehouseRepository extends BaseRepository {
  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(
        eq(warehouses.projectId, this.storeId),
        eq(warehouses.id, id)
      ))
      .limit(1);
    return result.length > 0;
  }

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

  async getAll(limit?: number): Promise<Warehouse[]> {
    const query = this.connection
      .select()
      .from(warehouses)
      .where(eq(warehouses.projectId, this.storeId))
      .orderBy(warehouses.createdAt);

    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(warehouses)
      .where(eq(warehouses.projectId, this.storeId));
    return result[0]?.count ?? 0;
  }

  async create(data: {
    code: string;
    name: string;
    isDefault?: boolean;
  }): Promise<Warehouse> {
    const id = uuidv7();
    const now = new Date().toISOString();

    const newWarehouse: NewWarehouse = {
      projectId: this.storeId,
      id,
      code: data.code,
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(warehouses)
      .values(newWarehouse)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: { code?: string; name?: string; isDefault?: boolean }
  ): Promise<Warehouse | null> {
    const updateData: Partial<NewWarehouse> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const result = await this.connection
      .update(warehouses)
      .set(updateData)
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

  // ============ DataLoader Support ============

  async getByIds(warehouseIds: readonly string[]): Promise<Warehouse[]> {
    return this.connection
      .select()
      .from(warehouses)
      .where(and(
        eq(warehouses.projectId, this.storeId),
        inArray(warehouses.id, [...warehouseIds])
      ));
  }

  // ============ Business Logic ============

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

  async clearDefault(): Promise<void> {
    await this.connection
      .update(warehouses)
      .set({ isDefault: false, updatedAt: new Date().toISOString() })
      .where(and(
        eq(warehouses.projectId, this.storeId),
        eq(warehouses.isDefault, true)
      ));
  }
}
```

## Repository Aggregator

Main `Repository` class aggregates all entity repositories:

```typescript
// repositories/Repository.ts

import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { WarehouseRepository } from "./warehouse/WarehouseRepository.js";
import { StockRepository } from "./stock/StockRepository.js";
import { CostRepository } from "./cost/CostRepository.js";

export class Repository {
  public readonly warehouse: WarehouseRepository;
  public readonly stock: StockRepository;
  public readonly cost: CostRepository;
  public readonly txManager: TransactionManager<Database>;

  /**
   * Get current database connection (transaction-aware).
   */
  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    warehouse: WarehouseRepository,
    stock: StockRepository,
    cost: CostRepository,
    txManager: TransactionManager<Database>
  ) {
    this.warehouse = warehouse;
    this.stock = stock;
    this.cost = cost;
    this.txManager = txManager;
  }

  static async create(config: { db: Database }): Promise<Repository> {
    const { db } = config;
    const txManager = new TransactionManager(db);

    const warehouse = new WarehouseRepository(db, txManager);
    const stock = new StockRepository(db, txManager);
    const cost = new CostRepository(db, txManager);

    return new Repository(warehouse, stock, cost, txManager);
  }
}
```

## Drizzle Schema

Define tables in `repositories/models/`:

```typescript
// repositories/models/stock.ts

import {
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
    unique("warehouses_project_id_id_unique").on(table.projectId, table.id),
  ]
);

// Type inference
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
```

## Connection Queries with drizzle-query

For paginated queries use `@shopana/drizzle-query`:

```typescript
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";

// Create relay query builder
export const warehouseRelayQuery = createRelayQuery(
  createQuery(warehouses).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "warehouse", tieBreaker: "id" }
);

export type WarehouseRelayInput = InferRelayInput<typeof warehouseRelayQuery>;

// In repository
async getConnection(args: WarehouseRelayInput): Promise<ConnectionResult> {
  const mergedWhere = {
    _and: [
      { projectId: { _eq: this.storeId } },
      ...(args.where ? [args.where] : []),
    ],
  };

  const [result, totalCount] = await Promise.all([
    warehouseRelayQuery.execute(this.connection, {
      ...args,
      where: mergedWhere,
      orderBy: args.orderBy ?? [{ field: "createdAt", direction: "desc" }],
    }),
    this.count(),
  ]);

  return {
    edges: result.edges.map((edge) => ({
      cursor: edge.cursor,
      nodeId: edge.node.id,
    })),
    pageInfo: result.pageInfo,
    totalCount,
  };
}
```

## Important Patterns

### 1. Always Use `this.connection`

```typescript
// Good: Uses transaction-aware connection
const result = await this.connection.select()...

// Bad: Bypasses transactions
const result = await this.db.select()...
```

### 2. Always Filter by storeId

```typescript
// Good: Multi-tenant safe
.where(and(
  eq(warehouses.projectId, this.storeId),
  eq(warehouses.id, id)
))

// Bad: Leaks data across tenants
.where(eq(warehouses.id, id))
```

### 3. UUID Generation

Use UUIDv7 for time-ordered, sortable IDs:

```typescript
import { v7 as uuidv7 } from "uuid";

const id = uuidv7();
```

### 4. Timestamp Handling

```typescript
const now = new Date().toISOString();

const entity = {
  createdAt: now,
  updatedAt: now,
};
```

## Standard Repository Methods

| Method | Description |
|--------|-------------|
| `exists(id)` | Check if entity exists |
| `findById(id)` | Get single entity by ID |
| `getAll(limit?)` | Get all entities with optional limit |
| `count()` | Count entities |
| `create(data)` | Create new entity |
| `update(id, data)` | Update entity |
| `delete(id)` | Delete entity |
| `getByIds(ids)` | Batch load for DataLoader |
| `getConnection(args)` | Paginated query |

## See Also

- [[drizzle-query/index]] — Query builder package
- [[drizzle-query/cursor-pagination]] — Relay pagination
- [[patterns/dataloader]] — DataLoader integration
- [[shared-kernel/transaction-manager]] — Transaction handling
