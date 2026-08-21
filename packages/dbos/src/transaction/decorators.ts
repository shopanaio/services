import "reflect-metadata";
import type { PostgresTransactionOptions } from "@dbos-inc/postgres-datasource";
import type { DbosTransactionBridge } from "./DbosTransactionBridge.js";
import { runTransactionalStep, type TransactionManagerLike } from "./runTransactionalStep.js";

export const TRANSACTIONAL_STEP_METADATA_KEY = Symbol("dbos:workflow:transactional-step");

export interface TransactionalStepMetadata<TSelf = unknown, TDatabase = unknown> {
  readonly name?: string;
  readonly isolationLevel?: PostgresTransactionOptions["isolationLevel"];
  readonly txManager: (self: TSelf) => TransactionManagerLike<TDatabase>;
  readonly bridge: (self: TSelf) => DbosTransactionBridge<TDatabase, PostgresTransactionOptions>;
}

/**
 * Create a service-local decorator for DBOS datasource transactions.
 *
 * Transactional steps intentionally do not expose JavaScript timeouts,
 * application retry policies, read-only mode or non-critical failure values.
 */
export function createTransactionalStep<TSelf = unknown, TDatabase = unknown>(
  metadata: TransactionalStepMetadata<TSelf, TDatabase>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as
      ((...args: unknown[]) => Promise<unknown>) | undefined;
    const methodName = typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;

    if (typeof originalMethod !== "function") {
      throw new TransactionalStepDefinitionError(methodName);
    }

    Reflect.defineMetadata(TRANSACTIONAL_STEP_METADATA_KEY, metadata, target, propertyKey);

    descriptor.value = async function (...args: unknown[]) {
      const self = this as TSelf;

      freezeTransactionalStepInputs(args);

      return runTransactionalStep(() => originalMethod.apply(this, args), {
        methodName,
        name: metadata.name,
        isolationLevel: metadata.isolationLevel,
        txManager: () => metadata.txManager(self),
        bridge: () => metadata.bridge(self),
      });
    };

    return descriptor;
  };
}

/**
 * Transactional-step inputs are workflow inputs, not mutable accumulators.
 * Freezing catches accidental mutation at the boundary during development and
 * tests; production relies on the same immutable TypeScript contract.
 */
function freezeTransactionalStepInputs(args: readonly unknown[]): void {
  if (process.env.NODE_ENV === "production") return;

  const seen = new WeakSet<object>();
  for (const arg of args) deepFreeze(arg, seen);
}

function deepFreeze(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key), seen);
  }
  Object.freeze(value);
}

class TransactionalStepDefinitionError extends TypeError {
  constructor(methodName: string) {
    super(`@TransactionalStep cannot decorate "${methodName}" because it is not a method`);
    this.name = "TransactionalStepDefinitionError";
  }
}
