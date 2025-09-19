import { AsyncLocalStorage } from "node:async_hooks";
import type { CheckoutContext } from "./types.js";

const storage = new AsyncLocalStorage<CheckoutContext>();

/**
 * Sets the checkout context for the current async execution context
 * Should be called by middleware at the beginning of request processing
 */
export function setContext(ctx: CheckoutContext): void {
  storage.enterWith(ctx);
}

/**
 * Gets the checkout context from the current async execution context
 * Throws error if context is not available
 */
export function getContext(): CheckoutContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("Checkout context not available - ensure middleware is properly configured");
  }
  return ctx;
}

/**
 * Gets the checkout context from the current async execution context
 * Returns null if context is not available
 */
export function getContextSafe(): CheckoutContext | null {
  return storage.getStore() ?? null;
}

/**
 * Runs a function within a specific checkout context
 * Useful for testing or special execution scenarios
 */
export async function runWithContext<T>(
  context: CheckoutContext,
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
