import { AsyncLocalStorage } from "node:async_hooks";
import { deriveCorrelationContext } from "./correlation.js";
import type { ServiceCorrelationExtendedContext } from "./types.js";
import { UnknownCorrelation } from "./types.js";

const storage = new AsyncLocalStorage<ServiceCorrelationExtendedContext>();

/**
 * Binds correlation context to the current async context
 */
export function bindCorrelation(ctx: ServiceCorrelationExtendedContext): void {
  storage.enterWith(ctx);
}

/**
 * Gets correlation context from the current async context
 */
export function getCorrelation(): ServiceCorrelationExtendedContext {
  return storage.getStore() ?? UnknownCorrelation;
}

/**
 * Creates correlation context from HTTP headers
 */
export function createCorrelationFromHeaders(
  headers: Record<string, unknown>,
  apiKey: string,
  projectId: string,
  userId?: string
): ServiceCorrelationExtendedContext {
  const baseCorrelation = deriveCorrelationContext(headers);

  return {
    ...baseCorrelation,
    apiKey,
    projectId,
    userId,
  };
}

/**
 * Runs function in correlation context
 */
export async function runWithCorrelation<T>(
  context: ServiceCorrelationExtendedContext,
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
