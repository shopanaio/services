import { AsyncLocalStorage } from "node:async_hooks";

// ============================================================================
// Decorators
// ============================================================================

/**
 * Symbol to access txManager from repository instance
 */
const TX_MANAGER_KEY = "txManager";

/**
 * @Transactional() - Decorator for write operations
 * Always wraps method execution in a transaction via txManager.run()
 * If already in transaction - reuses it
 */
export function Transactional(): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const txManager = this[TX_MANAGER_KEY] as TransactionManager<any, any>;
      if (!txManager) {
        throw new Error(
          `@Executable requires '${TX_MANAGER_KEY}' property on class instance`
        );
      }

      return txManager.run(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * @ReadOnly() - Decorator for read operations
 * Uses existing transaction if present, but does NOT start a new one
 * Method should use this.connection which returns tx or db automatically
 */
export function ReadOnly(): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // No-op decorator - just documents intent
    // Read methods use this.connection which handles tx/db automatically
    return descriptor;
  };
}

/**
 * Store for active transaction in AsyncLocalStorage
 */
interface TransactionStore<TTx> {
  /** Active Drizzle transaction */
  tx: TTx;
  /** Nesting depth (for debugging) */
  depth: number;
}

/**
 * AsyncLocalStorage for transaction storage
 * Singleton — one storage per process
 */
const transactionStorage = new AsyncLocalStorage<TransactionStore<unknown>>();

/**
 * Interface for database that supports transactions
 */
export interface TransactionalDatabase<TTransaction> {
  transaction<T>(fn: (tx: TTransaction) => Promise<T>): Promise<T>;
}

/**
 * Transaction Manager for DB transactions via AsyncLocalStorage
 *
 * Features:
 * - Automatic transaction creation on first run() call
 * - Reuses existing transaction for nested calls
 * - Automatic ROLLBACK on error, COMMIT on success (handled by Drizzle)
 *
 * @template TDatabase - Database type (Drizzle instance)
 * @template TTransaction - Drizzle transaction type
 */
export class TransactionManager<
  TDatabase extends TransactionalDatabase<TTransaction>,
  TTransaction = TDatabase
> {
  constructor(private readonly db: TDatabase) {}

  /**
   * Get current transaction from AsyncLocalStorage
   * @returns Active transaction or null
   */
  static getCurrent<T>(): T | null {
    const store = transactionStorage.getStore();
    return (store?.tx as T) ?? null;
  }

  /**
   * Check if we are inside a transaction
   */
  static isInTransaction(): boolean {
    return transactionStorage.getStore() !== undefined;
  }

  /**
   * Get current nesting depth (for debugging)
   * @returns Depth or 0 if not in transaction
   */
  static getDepth(): number {
    return transactionStorage.getStore()?.depth ?? 0;
  }

  /**
   * Get active connection: transaction (if exists) or db
   * Used in repositories for query execution
   */
  getConnection(): TDatabase | TTransaction {
    const store = transactionStorage.getStore();
    if (store) {
      return store.tx as TTransaction;
    }
    return this.db;
  }

  /**
   * Execute function in a transaction
   *
   * Drizzle db.transaction() behavior:
   * - fn() completes successfully → automatic COMMIT
   * - fn() throws error          → automatic ROLLBACK
   *
   * Nested calls:
   * - If transaction already active — reuse it (no new transaction)
   * - If no transaction — create new one
   *
   * @param fn - Function to execute in transaction
   * @returns Result of function execution
   * @throws Rethrows error after ROLLBACK
   */
  async run<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    const existingStore = transactionStorage.getStore();

    // Already in transaction — reuse existing
    if (existingStore) {
      existingStore.depth++;
      try {
        return await fn();
      } finally {
        existingStore.depth--;
      }
    }

    // New transaction
    // Drizzle automatically:
    // - COMMIT on successful completion
    // - ROLLBACK on throw
    return (await this.db.transaction(async (tx) => {
      const store: TransactionStore<TTransaction> = {
        tx: tx as TTransaction,
        depth: 1,
      };

      return await transactionStorage.run(store, async () => {
        return await fn();
      });
    })) as TResult;
  }

  /**
   * Execute function WITHOUT transaction (directly to db)
   * Used for read-only operations or when transaction is not needed
   */
  async runWithoutTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return await fn();
  }
}
