import { AsyncLocalStorage } from "node:async_hooks";
import { ServiceContext } from "./types.js";

const storage = new AsyncLocalStorage<ServiceContext>();

export function setContext(context: ServiceContext): void {
  storage.enterWith(context);
}

export function getContext(): ServiceContext {
  const context = storage.getStore();
  if (!context) {
    throw new Error("Service context not available - ensure middleware is properly configured");
  }
  return context;
}

export function getContextSafe(): ServiceContext | null {
  return storage.getStore() ?? null;
}

export async function runWithContext<T>(context: ServiceContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn);
}
