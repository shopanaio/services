import { DBOS } from "@dbos-inc/dbos-sdk";
import type { PostgresTransactionOptions } from "@dbos-inc/postgres-datasource";
import { stepContextStorage } from "../step/StepExecutionContext.js";
import type { DbosTransactionBridge } from "./DbosTransactionBridge.js";
import { TransactionalStepConfigurationError } from "./errors.js";

export interface TransactionManagerLike<TTransaction> {
  runWithExistingTransaction<TResult>(
    tx: TTransaction,
    fn: () => Promise<TResult>,
  ): Promise<TResult>;
}

export interface RunTransactionalStepOptions<TDatabase> {
  readonly methodName: string;
  readonly name?: string;
  readonly isolationLevel?: PostgresTransactionOptions["isolationLevel"];
  readonly txManager: () => TransactionManagerLike<TDatabase>;
  readonly bridge: () => DbosTransactionBridge<
    TDatabase,
    PostgresTransactionOptions
  >;
}

/**
 * Execute database-only work as a DBOS datasource transaction.
 *
 * The datasource owns transaction lifecycle, serialization retries and the
 * durable checkpoint. Errors must escape the callback so user writes roll
 * back and DBOS can persist the error checkpoint.
 */
export function runTransactionalStep<TDatabase, TResult>(
  fn: () => Promise<TResult>,
  options: RunTransactionalStepOptions<TDatabase>,
): Promise<TResult> {
  if (DBOS.workflowID === undefined || !DBOS.isInWorkflow()) {
    throw new TransactionalStepConfigurationError(
      `Transactional step "${options.name ?? options.methodName}" must be called directly from a DBOS workflow body`,
    );
  }

  const txManager = options.txManager();
  const bridge = options.bridge();

  if (typeof txManager?.runWithExistingTransaction !== "function") {
    throw new TransactionalStepConfigurationError(
      `Transactional step "${options.name ?? options.methodName}" resolved an invalid transaction manager`,
    );
  }

  if (typeof bridge?.runTransaction !== "function") {
    throw new TransactionalStepConfigurationError(
      `Transactional step "${options.name ?? options.methodName}" resolved an invalid DBOS transaction bridge`,
    );
  }

  const name = options.name ?? options.methodName;
  const transactionOptions: PostgresTransactionOptions & { name: string } = {
    name,
    ...(options.isolationLevel !== undefined && {
      isolationLevel: options.isolationLevel,
    }),
  };

  return bridge.runTransaction(transactionOptions, (txDb) =>
    txManager.runWithExistingTransaction(txDb, () => {
      const controller = new AbortController();
      return stepContextStorage.run({ signal: controller.signal }, fn);
    }),
  );
}
