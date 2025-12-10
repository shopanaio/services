import { AsyncLocalStorage } from "node:async_hooks";
import type { ServiceContext } from "./types.js";

const storage = new AsyncLocalStorage<ServiceContext>();

/**
 * Sets the service context for the current async execution context
 * Should be called by middleware at the beginning of request processing
 */
export function setContext(ctx: ServiceContext): void {
  storage.enterWith(ctx);
}

/**
 * Gets the service context from the current async execution context
 * Throws error if context is not available
 */
export function getContext(): ServiceContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("Service context not available - ensure middleware is properly configured");
  }
  return ctx;
}

/**
 * Gets the service context from the current async execution context
 * Returns null if context is not available
 */
export function getContextSafe(): ServiceContext | null {
  return storage.getStore() ?? null;
}

/**
 * Runs a function within a specific service context
 * Useful for testing or special execution scenarios
 */
export async function runWithContext<T>(
  context: ServiceContext,
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
