import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Token used to reference a value inside the async context store.
 */
export interface AsyncContextToken<TValue> {
  /** Human-readable name used only for debugging. */
  readonly name: string;
  /** Unique symbol preventing collisions between different tokens. */
  readonly symbol: symbol;
}

/**
 * Internal storage that keeps a map of token/value pairs per async execution context.
 */
const storage = new AsyncLocalStorage<Map<symbol, unknown>>();

/**
 * Creates a new token that can be used to read/write values in the store.
 *
 * @param name - Identifier displayed in errors and debugging helpers
 */
export function createAsyncContextToken<TValue>(name: string): AsyncContextToken<TValue> {
  return { name, symbol: Symbol(name) };
}

/**
 * Runs the provided function inside a fresh async context initialized with optional seed values.
 *
 * @param fn - Callback executed within the context
 * @param seed - Optional iterable of [token, value] pairs to pre-populate the store
 */
export async function runAsyncContext<TValue>(
  fn: () => Promise<TValue> | TValue,
  seed?: Iterable<readonly [AsyncContextToken<unknown>, unknown]>
): Promise<TValue> {
  const initial = new Map<symbol, unknown>();
  if (seed) {
    for (const [token, value] of seed) {
      initial.set(token.symbol, value);
    }
  }

  return storage.run(initial, async () => await fn());
}

/**
 * Stores a value for the specified token in the current async context.
 * Throws if no context is available.
 *
 * @param token - Token returned by {@link createAsyncContextToken}
 * @param value - Value to persist for the duration of the context
 */
export function setAsyncContextValue<TValue>(
  token: AsyncContextToken<TValue>,
  value: TValue
): void {
  const store = storage.getStore();
  if (!store) {
    throw new Error(
      `Async context is not initialized. Call runAsyncContext before setAsyncContextValue for token "${token.name}".`
    );
  }
  store.set(token.symbol, value);
}

/**
 * Reads a value associated with the provided token from the current async context.
 * Returns undefined when the value has not been set or context is absent.
 *
 * @param token - Token created with {@link createAsyncContextToken}
 */
export function getAsyncContextValue<TValue>(
  token: AsyncContextToken<TValue>
): TValue | undefined {
  const store = storage.getStore();
  if (!store) {
    return undefined;
  }
  return store.get(token.symbol) as TValue | undefined;
}

/**
 * Reads a value from the store and throws if it has not been set.
 *
 * @param token - Token used when storing the value
 * @param message - Optional error override. Default message includes token name.
 */
export function requireAsyncContextValue<TValue>(
  token: AsyncContextToken<TValue>,
  message?: string
): TValue {
  const value = getAsyncContextValue(token);
  if (value === undefined) {
    throw new Error(
      message ?? `Value for async context token "${token.name}" is not available.`
    );
  }
  return value;
}

/**
 * Indicates whether an async context has been initialized for the current execution path.
 */
export function hasAsyncContext(): boolean {
  return storage.getStore() !== undefined;
}

/**
 * Clears the async context for the current execution frame.
 * Primarily intended for tests to avoid leaking state between runs.
 */
export function clearAsyncContext(): void {
  const store = storage.getStore();
  if (store) {
    store.clear();
  }
}
