---
tags:
  - shared-kernel
  - transaction
  - drizzle
  - async-local-storage
  - database
related:
  - shared-kernel/index
  - shared-kernel/kernel
  - drizzle-query
---
# TransactionManager

AsyncLocalStorage-based transaction management for Drizzle ORM.

## Overview

`TransactionManager` provides transparent transaction propagation across async call stacks using Node.js `AsyncLocalStorage`. This enables:

1. **Automatic Transaction Wrapping** — Via `@Transactional` decorator or `Kernel.executeScript()`
2. **Transaction Propagation** — Nested calls reuse the same transaction
3. **Connection Abstraction** — `getConnection()` returns tx or db automatically
4. **Manual Control** — `run()` method for explicit transaction boundaries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AsyncLocalStorage                         │
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│   │  Request 1  │   │  Request 2  │   │  Request 3  │       │
│   │  tx: TX_A   │   │  tx: TX_B   │   │  tx: null   │       │
│   └─────────────┘   └─────────────┘   └─────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   TransactionManager                         │
│                                                              │
│   getConnection() → returns TX_A, TX_B, or db               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Basic Usage

### Creating TransactionManager

```typescript
import { TransactionManager } from "@shopana/shared-kernel";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(connectionString);
const db = drizzle(client, { schema });
const txManager = new TransactionManager(db);
```

### In Repository Pattern

```typescript
import { Injectable } from "@nestjs/common";
import {
  TransactionManager,
  Transactional,
  ReadOnly,
  InjectDatabaseClient,
  DatabaseClient,
} from "@shopana/shared-kernel";
import { drizzle } from "drizzle-orm/postgres-js";

@Injectable()
class ProductRepository {
  readonly txManager: TransactionManager<DrizzleDatabase>;

  constructor(@InjectDatabaseClient() client: DatabaseClient) {
    const db = drizzle(client, { schema });
    this.txManager = new TransactionManager(db);
  }

  // Always use getConnection() for queries
  protected get connection() {
    return this.txManager.getConnection();
  }

  @Transactional()
  async create(data: NewProduct): Promise<Product> {
    const [product] = await this.connection
      .insert(products)
      .values(data)
      .returning();
    return product;
  }

  @ReadOnly()
  async findById(id: string): Promise<Product | null> {
    const result = await this.connection
      .select()
      .from(products)
      .where(eq(products.id, id));
    return result[0] ?? null;
  }
}
```

## API Reference

### getConnection()

Returns current transaction or database connection:

```typescript
txManager.getConnection(): DrizzleDatabase | DrizzleTransaction

// Usage
const conn = this.txManager.getConnection();
await conn.select().from(products);
```

**Behavior:**
- If inside transaction context → returns transaction
- If outside transaction context → returns database connection

### run()

Execute function within a transaction:

```typescript
txManager.run<T>(fn: () => Promise<T>): Promise<T>

// Example
const result = await txManager.run(async () => {
  await this.create(product1);
  await this.create(product2);
  return "success";
});
// Both creates succeed or both fail
```

**Transaction behavior:**
- Starts new transaction if not in one
- Reuses existing transaction if already in one (nesting)
- Commits on success
- Rolls back on error

### runReadOnly()

Execute function with read-only connection:

```typescript
txManager.runReadOnly<T>(fn: () => Promise<T>): Promise<T>

// Example
const products = await txManager.runReadOnly(async () => {
  return this.connection.select().from(products).limit(10);
});
```

### Static Methods

```typescript
// Check if currently in transaction
TransactionManager.isInTransaction(): boolean

// Get current nesting depth
TransactionManager.getDepth(): number

// Get current transaction (or null)
TransactionManager.getCurrent<Tx>(): Tx | null
```

## Decorators

### @Transactional()

Wraps method in transaction:

```typescript
import { Transactional } from "@shopana/shared-kernel";

class ProductRepository {
  @Transactional()
  async create(data: NewProduct): Promise<Product> {
    // Automatically wrapped in transaction
    return this.connection.insert(products).values(data).returning();
  }

  @Transactional()
  async createMany(items: NewProduct[]): Promise<Product[]> {
    // All inserts in same transaction
    const results: Product[] = [];
    for (const item of items) {
      const [product] = await this.connection
        .insert(products)
        .values(item)
        .returning();
      results.push(product);
    }
    return results;
  }
}
```

### @ReadOnly()

Documents read-only intent, uses existing transaction if present:

```typescript
import { ReadOnly } from "@shopana/shared-kernel";

class ProductRepository {
  @ReadOnly()
  async findById(id: string): Promise<Product | null> {
    const result = await this.connection
      .select()
      .from(products)
      .where(eq(products.id, id));
    return result[0] ?? null;
  }

  @ReadOnly()
  async findAll(limit: number): Promise<Product[]> {
    return this.connection
      .select()
      .from(products)
      .limit(limit);
  }
}
```

**Note:** `@ReadOnly()` doesn't prevent writes—it's a documentation hint and ensures the method uses the current connection context.

## Transaction Propagation

### Nested Transactions

Nested `@Transactional` calls reuse the same transaction:

```typescript
class OrderService {
  @Transactional()
  async createOrder(input: OrderInput): Promise<Order> {
    // Transaction starts here
    const order = await this.orderRepo.create(input);

    // This runs in the SAME transaction
    await this.lineItemRepo.createMany(input.items);

    // And this too
    await this.inventoryRepo.decrementStock(input.items);

    return order;
    // Transaction commits here (if all succeeded)
  }
}

class LineItemRepository {
  @Transactional()
  async createMany(items: LineItemInput[]): Promise<LineItem[]> {
    // Reuses parent transaction (no new BEGIN)
    const results: LineItem[] = [];
    for (const item of items) {
      results.push(await this.create(item));
    }
    return results;
  }
}
```

### Cross-Repository Transactions

```typescript
class CheckoutService {
  constructor(
    private cartRepo: CartRepository,
    private orderRepo: OrderRepository,
    private inventoryRepo: InventoryRepository,
  ) {}

  @Transactional()
  async checkout(cartId: string): Promise<Order> {
    // All operations in same transaction
    const cart = await this.cartRepo.findById(cartId);

    const order = await this.orderRepo.create({
      items: cart.items,
      total: cart.total,
    });

    await this.inventoryRepo.decrementStock(cart.items);

    await this.cartRepo.delete(cartId);

    return order;
    // If any operation fails, everything rolls back
  }
}
```

## Kernel Integration

The `Kernel` uses `TransactionManager` internally:

```typescript
// executeScript() wraps in transaction
await kernel.executeScript(
  async (params, services) => {
    // This is inside a transaction
    await services.repository.product.create(params.product);
    await services.repository.stockLevel.create(params.stock);
  },
  input
);

// executeScriptReadOnly() does not wrap
await kernel.executeScriptReadOnly(
  async (params, services) => {
    // Direct database access
    return services.repository.product.findById(params.id);
  },
  { id: productId }
);
```

## Best Practices

### 1. Always Use getConnection()

```typescript
// Good
async findById(id: string) {
  return this.txManager.getConnection()
    .select()
    .from(products)
    .where(eq(products.id, id));
}

// Bad: direct db access ignores transaction context
async findById(id: string) {
  return this.db
    .select()
    .from(products)
    .where(eq(products.id, id));
}
```

### 2. Mark Write Methods with @Transactional

```typescript
class ProductRepository {
  @Transactional()
  async create(data: NewProduct) { ... }

  @Transactional()
  async update(id: string, data: Partial<Product>) { ... }

  @Transactional()
  async delete(id: string) { ... }

  @ReadOnly()
  async findById(id: string) { ... }

  @ReadOnly()
  async findAll() { ... }
}
```

### 3. Use SELECT FOR UPDATE for Concurrent Access

```typescript
@Transactional()
async reserveStock(productId: string, quantity: number): Promise<void> {
  // Lock the row for update
  const [stock] = await this.connection
    .select()
    .from(stockLevels)
    .where(eq(stockLevels.productId, productId))
    .for("update");

  if (stock.available < quantity) {
    throw new FatalError("Insufficient stock");
  }

  await this.connection
    .update(stockLevels)
    .set({
      available: sql`${stockLevels.available} - ${quantity}`,
      reserved: sql`${stockLevels.reserved} + ${quantity}`,
    })
    .where(eq(stockLevels.productId, productId));
}
```

### 4. Handle Transaction Errors

```typescript
try {
  await kernel.executeScript(createOrderScript, input);
} catch (error) {
  // Transaction already rolled back automatically
  if (error instanceof FatalError) {
    logger.error({ error }, "Order creation failed");
  }
  throw error;
}
```

## Debugging Transactions

```typescript
// Check transaction state
const inTx = TransactionManager.isInTransaction();
const depth = TransactionManager.getDepth();
const currentTx = TransactionManager.getCurrent();

logger.debug({
  inTransaction: inTx,
  depth,
  hasTx: currentTx !== null,
}, "Transaction state");
```

## Type Definitions

```typescript
import type {
  TransactionalDatabase,
  TransactionManagerOptions,
} from "@shopana/shared-kernel";

// Generic transaction manager
class TransactionManager<TDb extends TransactionalDatabase> {
  constructor(db: TDb, options?: TransactionManagerOptions);
  getConnection(): TDb | Transaction<TDb>;
  run<T>(fn: () => Promise<T>): Promise<T>;
  runReadOnly<T>(fn: () => Promise<T>): Promise<T>;

  static isInTransaction(): boolean;
  static getDepth(): number;
  static getCurrent<Tx>(): Tx | null;
}
```

## Related

- [[shared-kernel/kernel]] — Kernel transaction script execution
- [[drizzle-query]] — Drizzle ORM query patterns
- [[shared-kernel/decorators]] — @Transactional and @ReadOnly decorators
