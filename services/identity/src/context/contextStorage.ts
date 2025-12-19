import { AsyncLocalStorage } from "node:async_hooks";
import type { ServiceContext } from "./types.js";

const contextStorage = new AsyncLocalStorage<ServiceContext>();

export function setContext(ctx: ServiceContext): void {
  contextStorage.enterWith(ctx);
}

export function getContext(): ServiceContext {
  const ctx = contextStorage.getStore();
  if (!ctx) {
    throw new Error("Context not available - make sure to call setContext first");
  }
  return ctx;
}

export function getContextOrNull(): ServiceContext | null {
  return contextStorage.getStore() ?? null;
}
