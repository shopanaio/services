import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Base context interface that can be extended for specific use cases.
 * Contains loaders and request-scoped parameters.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BaseContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loaders: Record<string, { load: (key: any) => Promise<any> }>;
  [key: string]: unknown;
}

/**
 * Internal AsyncLocalStorage for context management.
 */
const contextStorage = new AsyncLocalStorage<BaseContext>();

/**
 * Retrieves the current context from AsyncLocalStorage.
 * @throws Error if no context is available
 */
export function getContext<T extends BaseContext = BaseContext>(): T {
  const ctx = contextStorage.getStore();
  if (!ctx) {
    throw new Error("No context available. Ensure you are running within runWithContext.");
  }
  return ctx as T;
}

/**
 * Runs a function within a context.
 * @param context - The context to make available during execution
 * @param fn - The function to execute
 * @returns The result of the function
 */
export async function runWithContext<T, C extends BaseContext = BaseContext>(
  context: C,
  fn: () => Promise<T> | T
): Promise<T> {
  return contextStorage.run(context, async () => await fn());
}

/**
 * Synchronous version of runWithContext for cases where async is not needed.
 * @param context - The context to make available during execution
 * @param fn - The function to execute
 * @returns The result of the function
 */
export function runWithContextSync<T, C extends BaseContext = BaseContext>(
  context: C,
  fn: () => T
): T {
  return contextStorage.run(context, fn);
}

/**
 * Checks if a context is currently available.
 */
export function hasContext(): boolean {
  return contextStorage.getStore() !== undefined;
}

/**
 * For testing purposes - allows direct access to enter context.
 * Use runWithContext for production code.
 */
export function enterContext<C extends BaseContext = BaseContext>(context: C): void {
  contextStorage.enterWith(context);
}

/**
 * Exports the storage for advanced use cases.
 */
export { contextStorage };
