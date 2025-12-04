import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { InventoryKernelServices } from "./types";
import type { Logger } from "@shopana/shared-kernel";
import type { Repository } from "../repositories";

/**
 * Extended kernel for inventory microservice
 */
export class Kernel extends BaseKernel<InventoryKernelServices> {
  constructor(repository: Repository, logger: Logger, broker: any) {
    super(broker, logger, { repository });
  }
}

export type { InventoryKernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
