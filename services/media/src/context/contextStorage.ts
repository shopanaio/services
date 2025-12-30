import { AsyncLocalStorage } from "node:async_hooks";
import { ServiceContext } from "./types.js";

const storage = new AsyncLocalStorage<ServiceContext>();

/**
 * Sets the service context for the current async execution context
 * Should be called in GraphQL context function
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
    throw new Error("Service context not available - ensure context is properly configured");
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
