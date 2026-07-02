import { AsyncLocalStorage } from "node:async_hooks";
import { ServiceContext } from "./types.js";

const storage = new AsyncLocalStorage<ServiceContext>();

export function setContext(ctx: ServiceContext): void {
  storage.enterWith(ctx);
}

export function getContext(): ServiceContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "Service context not available - ensure middleware is properly configured"
    );
  }
  return ctx;
}

export function getContextSafe(): ServiceContext | null {
  return storage.getStore() ?? null;
}

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
