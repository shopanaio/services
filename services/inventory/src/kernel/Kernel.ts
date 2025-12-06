import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { InventoryKernelServices } from "./types";
import type { Logger } from "@shopana/shared-kernel";
import type { Repository } from "../repositories";
import { BaseScript } from "./BaseScript.js";

/**
 * Extended kernel for inventory microservice
 */
export class Kernel extends BaseKernel<InventoryKernelServices> {
  constructor(repository: Repository, logger: Logger, broker: any) {
    super(broker, logger, { repository });
  }

  /**
   * Execute a class-based script with automatic transaction management
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: InventoryKernelServices) => BaseScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult> {
    const txManager = this.services.repository?.txManager;

    const execute = async (): Promise<TResult> => {
      const script = new ScriptClass(this.services);
      return script.run(params);
    };

    if (txManager) {
      return txManager.run(execute);
    }

    return execute();
  }
}

export type { InventoryKernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
export { BaseScript, type UserError } from "./BaseScript.js";
