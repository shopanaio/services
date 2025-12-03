import { AsyncLocalStorage } from "node:async_hooks";
import type { MediaContext } from "./types.js";

const storage = new AsyncLocalStorage<MediaContext>();

/**
 * Sets the media context for the current async execution context
 * Should be called by middleware at the beginning of request processing
 */
export function setContext(ctx: MediaContext): void {
  storage.enterWith(ctx);
}

/**
 * Gets the media context from the current async execution context
 * Throws error if context is not available
 */
export function getContext(): MediaContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("Media context not available - ensure middleware is properly configured");
  }
  return ctx;
}

/**
 * Gets the media context from the current async execution context
 * Returns null if context is not available
 */
export function getContextSafe(): MediaContext | null {
  return storage.getStore() ?? null;
}

/**
 * Runs a function within a specific media context
 * Useful for testing or special execution scenarios
 */
export async function runWithContext<T>(
  context: MediaContext,
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
