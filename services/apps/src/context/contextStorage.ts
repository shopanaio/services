import { AsyncLocalStorage } from "node:async_hooks";
import type { ServiceContext } from "./types.js";

const storage = new AsyncLocalStorage<ServiceContext>();

export function setContext(context: ServiceContext): void {
  storage.enterWith(context);
}

export function getContext(): ServiceContext {
  const context = storage.getStore();
  if (!context) {
    throw new Error(
      "Service context not available - ensure middleware is properly configured",
    );
  }
  return context;
}

export function getContextSafe(): ServiceContext | null {
  return storage.getStore() ?? null;
}

export function runWithContext<TResult>(
  context: ServiceContext,
  callback: () => Promise<TResult>,
): Promise<TResult> {
  return storage.run(context, callback);
}
