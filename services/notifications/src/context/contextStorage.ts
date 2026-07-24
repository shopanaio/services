import { AsyncLocalStorage } from "node:async_hooks";
import type { ServiceContext } from "./types.js";

const storage = new AsyncLocalStorage<ServiceContext>();

export function setContext(context: ServiceContext): void {
  storage.enterWith(context);
}

export function getContext(): ServiceContext {
  const context = storage.getStore();
  if (!context) {
    throw new Error("Notifications service context is not available");
  }
  return context;
}

export function getContextSafe(): ServiceContext | null {
  return storage.getStore() ?? null;
}

export function runWithContext<T>(
  context: ServiceContext,
  operation: () => Promise<T>
): Promise<T> {
  return storage.run(context, operation);
}
