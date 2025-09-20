import { AsyncLocalStorage } from "node:async_hooks";
import type { OrderContext } from "./types.js";

const storage = new AsyncLocalStorage<OrderContext>();

/**
 * Sets the order context for the current async execution context
 * Should be called by middleware at the beginning of request processing
 */
export function setContext(ctx: OrderContext): void {
  storage.enterWith(ctx);
}

/**
 * Gets the order context from the current async execution context
 * Throws error if context is not available
 */
export function getContext(): OrderContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("Order context not available - ensure middleware is properly configured");
  }
  return ctx;
}

/**
 * Gets the order context from the current async execution context
 * Returns null if context is not available
 */
export function getContextSafe(): OrderContext | null {
  return storage.getStore() ?? null;
}

/**
 * Runs a function within a specific order context
 * Useful for testing or special execution scenarios
 */
export async function runWithContext<T>(
  context: OrderContext,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    storage.run(context, async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}
