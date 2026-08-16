import "reflect-metadata";
import type { PostgresTransactionOptions } from "@dbos-inc/postgres-datasource";
import type { DbosTransactionBridge } from "./DbosTransactionBridge.js";
import {
  runTransactionalStep,
  type TransactionManagerLike,
} from "./runTransactionalStep.js";

export const TRANSACTIONAL_STEP_METADATA_KEY = Symbol(
  "dbos:workflow:transactional-step",
);

export interface TransactionalStepMetadata<
  TSelf = unknown,
  TDatabase = unknown,
> {
  readonly name?: string;
  readonly isolationLevel?: PostgresTransactionOptions["isolationLevel"];
  readonly txManager: (
    self: TSelf,
  ) => TransactionManagerLike<TDatabase>;
  readonly bridge: (
    self: TSelf,
  ) => DbosTransactionBridge<TDatabase, PostgresTransactionOptions>;
}

/**
 * Mark a workflow method as a DBOS datasource transaction.
 *
 * Transactional steps intentionally do not expose JavaScript timeouts,
 * application retry policies, read-only mode or non-critical failure values.
 */
export function TransactionalStep<TSelf = unknown, TDatabase = unknown>(
  metadata: TransactionalStepMetadata<TSelf, TDatabase>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as
      | ((...args: unknown[]) => Promise<unknown>)
      | undefined;
    const methodName =
      typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;

    if (typeof originalMethod !== "function") {
      throw new TransactionalStepDefinitionError(methodName);
    }

    Reflect.defineMetadata(
      TRANSACTIONAL_STEP_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );

    descriptor.value = async function (...args: unknown[]) {
      const self = this as TSelf;

      return runTransactionalStep(
        () => originalMethod.apply(this, args),
        {
          methodName,
          name: metadata.name,
          isolationLevel: metadata.isolationLevel,
          txManager: () => metadata.txManager(self),
          bridge: () => metadata.bridge(self),
        },
      );
    };

    return descriptor;
  };
}

class TransactionalStepDefinitionError extends TypeError {
  constructor(methodName: string) {
    super(
      `@TransactionalStep cannot decorate "${methodName}" because it is not a method`,
    );
    this.name = "TransactionalStepDefinitionError";
  }
}
