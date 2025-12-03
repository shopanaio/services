import { AsyncLocalStorage } from "node:async_hooks";
import type { InventoryContext } from "./types.js";

const storage = new AsyncLocalStorage<InventoryContext>();

/**
 * Sets the inventory context for the current async execution context
 * Should be called by middleware at the beginning of request processing
 */
export function setContext(ctx: InventoryContext): void {
  storage.enterWith(ctx);
}

/**
 * Gets the inventory context from the current async execution context
 * Throws error if context is not available
 */
export function getContext(): InventoryContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("Inventory context not available - ensure middleware is properly configured");
  }
  return ctx;
}

/**
 * Gets the inventory context from the current async execution context
 * Returns null if context is not available
 */
export function getContextSafe(): InventoryContext | null {
  return storage.getStore() ?? null;
}

/**
 * Runs a function within a specific inventory context
 * Useful for testing or special execution scenarios
 */
export async function runWithContext<T>(
  context: InventoryContext,
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
