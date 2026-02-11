---
tags:
  - pattern
  - dataloader
  - batching
  - caching
  - n+1
related:
  - "[[patterns/resolver]]"
  - "[[patterns/repository]]"
  - "[[architecture/service-structure]]"
---

# DataLoader Pattern

DataLoader solves the N+1 problem by batching and caching database requests within a single request.

## Overview

| Aspect | Description |
|--------|-------------|
| Library | `dataloader` (npm package) |
| Location | `services/{name}/src/loaders/` |
| Scope | Per-request (created fresh for each GraphQL request) |
| Purpose | Batch multiple `.load(id)` calls into single `getByIds()` query |

## Architecture

```
Request
   │
   ▼
┌─────────────────┐
│ Context         │ ← Creates new Loader instance
│ Middleware      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Loader          │ ← Aggregates all entity loaders
│ (per-request)   │
└────────┬────────┘
         │
    ┌────┴────┬────────┐
    ▼         ▼        ▼
┌───────┐ ┌───────┐ ┌───────┐
│Entity │ │Entity │ │Entity │  ← Individual DataLoaders
│Loader │ │Loader │ │Loader │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │        │
    ▼         ▼        ▼
┌─────────────────────────────┐
│        Repository           │ ← Batch queries via getByIds()
└─────────────────────────────┘
```

## Loader Aggregator

Main `Loader` class aggregates all entity loaders:

```typescript
// loaders/Loader.ts

import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { WarehouseLoader } from "./WarehouseLoader.js";
import { InventoryItemLoader } from "./InventoryItemLoader.js";

export class Loader {
  // Warehouse loaders
  public readonly warehouse: DataLoader<string, Warehouse | null>;

  // InventoryItem loaders
  public readonly inventoryItem: DataLoader<string, InventoryItem | null>;
  public readonly inventoryItemByVariant: DataLoader<string, InventoryItem | null>;

  // Index signature for dynamic access
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const warehouseLoader = new WarehouseLoader(repository);
    const inventoryItemLoader = new InventoryItemLoader(repository);

    // Warehouse
    this.warehouse = warehouseLoader.warehouse;

    // InventoryItem
    this.inventoryItem = inventoryItemLoader.inventoryItem;
    this.inventoryItemByVariant = inventoryItemLoader.inventoryItemByVariant;
  }
}
```

## Entity Loader

Individual loader for an entity:

```typescript
// loaders/WarehouseLoader.ts

import DataLoader from "dataloader";
import type { Warehouse } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class WarehouseLoader {
  public readonly warehouse: DataLoader<string, Warehouse | null>;

  constructor(repository: Repository) {
    this.warehouse = new DataLoader<string, Warehouse | null>(
      async (warehouseIds) => {
        // 1. Batch query
        const results = await repository.warehouse.getByIds(warehouseIds);

        // 2. Map results back to input order
        return warehouseIds.map(
          (id) => results.find((w) => w.id === id) ?? null
        );
      }
    );
  }
}
```

## Creating a New Loader

### Step 1: Add `getByIds()` to Repository

```typescript
// repositories/warehouse/WarehouseRepository.ts

async getByIds(warehouseIds: readonly string[]): Promise<Warehouse[]> {
  return this.connection
    .select()
    .from(warehouses)
    .where(
      and(
        eq(warehouses.projectId, this.storeId),
        inArray(warehouses.id, [...warehouseIds])
      )
    );
}
```

### Step 2: Create Entity Loader

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

### Step 3: Register in Loader Aggregator

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

### Step 4: Use in Resolver

```typescript
// resolvers/admin/WarehouseResolver.ts

export class WarehouseResolver extends InventoryType<string, Warehouse | null> {
  async $preload() {
    return this.$ctx.loaders.warehouse.load(this.$props);
  }
}
```

## Multiple Loaders per Entity

Sometimes you need different ways to load an entity:

```typescript
// loaders/InventoryItemLoader.ts

export class InventoryItemLoader {
  // Load by InventoryItem ID
  public readonly inventoryItem: DataLoader<string, InventoryItem | null>;

  // Load by Variant ID (different lookup key)
  public readonly inventoryItemByVariant: DataLoader<string, InventoryItem | null>;

  constructor(repository: Repository) {
    // By ID
    this.inventoryItem = new DataLoader<string, InventoryItem | null>(
      async (ids) => {
        const results = await repository.inventoryItem.getByIds(ids);
        return ids.map((id) => results.find((item) => item.id === id) ?? null);
      }
    );

    // By Variant ID
    this.inventoryItemByVariant = new DataLoader<string, InventoryItem | null>(
      async (variantIds) => {
        const results = await repository.inventoryItem.getByVariantIds(variantIds);
        return variantIds.map(
          (variantId) => results.find((item) => item.variantId === variantId) ?? null
        );
      }
    );
  }
}
```

## Using Loaders

### In Resolver $preload()

```typescript
export class WarehouseResolver extends InventoryType<string, Warehouse | null> {
  async $preload() {
    return this.$ctx.loaders.warehouse.load(this.$props);
  }

  // Fields can access this.$data after preload
  code() {
    return this.$data!.code;
  }
}
```

### Direct Access in Resolver Methods

```typescript
export class StockResolver extends InventoryType<string, Stock | null> {
  async warehouse() {
    const warehouseId = this.$data!.warehouseId;
    const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
    if (!warehouse) return null;
    return new WarehouseResolver(warehouse.id, this.$ctx);
  }
}
```

### In Federation Resolver

```typescript
export class VariantFederationResolver extends InventoryType<string> {
  async inventoryItem() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }
}
```

## DataLoader Options

```typescript
new DataLoader<string, Warehouse | null>(
  batchFn,
  {
    // Disable caching (load same key multiple times)
    cache: false,

    // Custom cache key function
    cacheKeyFn: (key) => key.toLowerCase(),

    // Max batch size
    maxBatchSize: 100,

    // Batch scheduling function
    batchScheduleFn: (callback) => setTimeout(callback, 10),
  }
);
```

## Best Practices

### 1. Always Return Correct Order

DataLoader requires results in the same order as input keys:

```typescript
// Good
return ids.map((id) => results.find((r) => r.id === id) ?? null);

// Bad - wrong order!
return results;
```

### 2. Handle Missing Items

Return `null` for items not found:

```typescript
return ids.map((id) => results.find((r) => r.id === id) ?? null);
```

### 3. One Loader per Request

Loaders are created per-request to avoid caching across users:

```typescript
// In context middleware
const loaders = new Loader(kernel.repository);
const context = new ServiceContext({ loaders, ... });
```

### 4. Use Loaders for Related Entities

```typescript
// Good: Use loader
async warehouse() {
  return this.$ctx.loaders.warehouse.load(this.$data!.warehouseId);
}

// Bad: Direct query (causes N+1)
async warehouse() {
  return this.$ctx.kernel.repository.warehouse.findById(this.$data!.warehouseId);
}
```

## File Organization

```
loaders/
├── Loader.ts              # Main aggregator
├── WarehouseLoader.ts     # Warehouse loaders
├── InventoryItemLoader.ts # InventoryItem loaders
└── StockLoader.ts         # Stock loaders
```

## See Also

- [[patterns/resolver]] — How resolvers use loaders
- [[patterns/repository]] — Repository getByIds() pattern
- [[architecture/service-structure]] — Where loaders live
