# Shared DataSource with AsyncLocalStorage

An approach to ensure transactionality between different services working with a single database.

## Problem

- Multiple services (inventory, orders, payments)
- Single PostgreSQL database
- Different DB connections in each service
- Need atomicity of operations across services

## Solution

Single `DataSource` + `AsyncLocalStorage` for automatic `EntityManager` propagation through the call stack.

## Structure

```
packages/
  shared-database/
    src/
      index.ts          # DataSource + transaction utilities
      entities/         # Shared entities (optional)
```

## Implementation

### 1. Shared Database Package

```typescript
// packages/shared-database/src/index.ts
import { DataSource, EntityManager } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for storing current EntityManager
const transactionContext = new AsyncLocalStorage<EntityManager>();

// Single DataSource for all services
export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // entities are loaded from each service
  entities: [],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  pool: {
    min: 2,
    max: 10,
  },
});

/**
 * Get current EntityManager
 * - If inside transaction — returns transactional manager
 * - Otherwise — returns default manager
 */
export function getManager(): EntityManager {
  return transactionContext.getStore() ?? dataSource.manager;
}

/**
 * Execute function inside a transaction
 * All getManager() calls within fn will receive the same EntityManager
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // If already inside transaction — just execute
  if (transactionContext.getStore()) {
    return fn();
  }

  return dataSource.transaction(async (manager) => {
    return transactionContext.run(manager, fn);
  });
}

/**
 * Execute function with specific isolation level
 */
export async function withTransactionIsolation<T>(
  isolationLevel: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE',
  fn: () => Promise<T>
): Promise<T> {
  if (transactionContext.getStore()) {
    return fn();
  }

  return dataSource.transaction(isolationLevel, async (manager) => {
    return transactionContext.run(manager, fn);
  });
}

/**
 * Initialize DataSource
 */
export async function initDatabase(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
}

/**
 * Close DataSource
 */
export async function closeDatabase(): Promise<void> {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
```

### 2. Entity Registration

Each service registers its entities on startup:

```typescript
// services/inventory/src/index.ts
import { dataSource, initDatabase } from '@shopana/shared-database';
import { Stock } from './entities/Stock';
import { Reservation } from './entities/Reservation';

// Add service entities
dataSource.options.entities = [
  ...(dataSource.options.entities as any[]),
  Stock,
  Reservation,
];

await initDatabase();
```

### 3. Usage in Services

#### Inventory Service

```typescript
// services/inventory/src/reserveStock.ts
import { getManager } from '@shopana/shared-database';
import { Stock } from './entities/Stock';
import { Reservation } from './entities/Reservation';

export async function reserveStock(productId: string, quantity: number): Promise<Reservation> {
  const manager = getManager();

  // Check availability
  const stock = await manager.findOneOrFail(Stock, {
    where: { productId },
    lock: { mode: 'pessimistic_write' }, // FOR UPDATE
  });

  if (stock.available < quantity) {
    throw new Error('Insufficient stock');
  }

  // Decrease available quantity
  stock.available -= quantity;
  stock.reserved += quantity;
  await manager.save(stock);

  // Create reservation
  const reservation = manager.create(Reservation, {
    productId,
    quantity,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
  });

  return manager.save(reservation);
}
```

#### Orders Service

```typescript
// services/orders/src/createOrder.ts
import { getManager } from '@shopana/shared-database';
import { Order } from './entities/Order';
import { OrderLine } from './entities/OrderLine';

export async function createOrder(dto: CreateOrderDto): Promise<Order> {
  const manager = getManager();

  const order = manager.create(Order, {
    customerId: dto.customerId,
    status: 'pending',
  });

  await manager.save(order);

  const lines = dto.items.map(item =>
    manager.create(OrderLine, {
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })
  );

  await manager.save(lines);

  return order;
}
```

#### Checkout Service (Coordinator)

```typescript
// services/checkout/src/checkout.ts
import { withTransaction } from '@shopana/shared-database';
import { reserveStock } from '@shopana/inventory';
import { createOrder } from '@shopana/orders';
import { processPayment } from '@shopana/payments';

export async function checkout(dto: CheckoutDto): Promise<Order> {
  // Everything executes in a single transaction
  return withTransaction(async () => {
    // 1. Reserve items
    for (const item of dto.items) {
      await reserveStock(item.productId, item.quantity);
    }

    // 2. Create order
    const order = await createOrder({
      customerId: dto.customerId,
      items: dto.items,
    });

    // 3. Process payment
    await processPayment({
      orderId: order.id,
      amount: dto.totalAmount,
      method: dto.paymentMethod,
    });

    return order;
  });
}
```

## Nested Transactions

`withTransaction` supports nested calls — inner calls reuse the existing transaction:

```typescript
async function outerOperation() {
  return withTransaction(async () => {
    await doSomething();

    // Does not create a new transaction, uses existing one
    await withTransaction(async () => {
      await doSomethingElse();
    });
  });
}
```

## Isolation Levels

For critical operations use `withTransactionIsolation`:

```typescript
// Protection against race conditions during reservation
await withTransactionIsolation('SERIALIZABLE', async () => {
  const stock = await getManager().findOne(Stock, { where: { productId } });
  if (stock.available >= quantity) {
    await reserveStock(productId, quantity);
  }
});
```

## Testing

```typescript
// tests/checkout.test.ts
import { dataSource, withTransaction } from '@shopana/shared-database';

beforeAll(async () => {
  await dataSource.initialize();
});

afterAll(async () => {
  await dataSource.destroy();
});

beforeEach(async () => {
  // Rollback after each test
  await dataSource.query('BEGIN');
});

afterEach(async () => {
  await dataSource.query('ROLLBACK');
});

it('should create order with reserved stock', async () => {
  const order = await checkout({
    customerId: 'user-1',
    items: [{ productId: 'prod-1', quantity: 2 }],
  });

  expect(order.status).toBe('pending');
});
```

## Monitoring and Debugging

```typescript
// Logging active transactions
dataSource.subscribers.push({
  afterTransactionStart(event) {
    console.log('Transaction started:', event.queryRunner.connection.options.database);
  },
  afterTransactionCommit(event) {
    console.log('Transaction committed');
  },
  afterTransactionRollback(event) {
    console.log('Transaction rolled back');
  },
});
```

## Limitations

1. **Single process** — AsyncLocalStorage works only within a single Node.js process
2. **Synchronous calls** — context is not propagated through HTTP/NATS/etc.
3. **No savepoints** — nested `withTransaction` calls do not create savepoints

## When to Switch to Distributed Transactions

If services become separate processes:
- Saga Pattern for orchestration
- Outbox Pattern for reliable event publishing
- Event Sourcing (already available via Dumbo)

## See Also

- [TypeORM Transactions](https://typeorm.io/transactions)
- [AsyncLocalStorage](https://nodejs.org/api/async_context.html)
- [Saga Pattern](./saga-pattern.md)
