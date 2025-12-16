import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { ProjectKernelServices } from "./types.js";
import type { Logger } from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";

/**
 * Extended kernel for project microservice
 */
export class Kernel extends BaseKernel<ProjectKernelServices> {
  constructor(repository: Repository, logger: Logger, broker: any) {
    super(broker, logger, { repository });
  }

  /**
   * Execute a class-based script with automatic transaction management
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: ProjectKernelServices) => BaseScript<TParams, TResult>,
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

export type { ProjectKernelServices, ScriptContext, TransactionScript } from "./types.js";
export { KernelError } from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
