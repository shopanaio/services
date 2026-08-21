import { createTransactionalStep } from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";

/**
 * Runs a Catalog workflow write step in the service database transaction that
 * DBOS checkpoints atomically with the step result.
 */
interface CatalogTransactionalStepHost {
  readonly transactionKernel: Kernel;
}

export function TransactionalStep(): MethodDecorator {
  return createTransactionalStep<CatalogTransactionalStepHost>({
    txManager: (self) => self.transactionKernel.repository.txManager,
    bridge: (self) => self.transactionKernel.repository.dbosTransactionBridge,
  });
}
