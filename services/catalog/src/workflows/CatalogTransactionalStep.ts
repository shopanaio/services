import { createTransactionalStep } from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";

/**
 * Runs a Catalog workflow write step in the service database transaction that
 * DBOS checkpoints atomically with the step result.
 */
export function TransactionalStep(): MethodDecorator {
  return createTransactionalStep({
    txManager: () => Kernel.getInstance().repository.txManager,
    bridge: () => Kernel.getInstance().repository.dbosTransactionBridge,
  });
}
