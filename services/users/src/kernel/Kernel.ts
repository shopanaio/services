import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { UsersKernelServices } from "./types.js";
import type { Logger } from "@shopana/shared-kernel";
import type { Repository } from "../repositories/index.js";
import { BaseScript } from "./BaseScript.js";

/**
 * Extended kernel for users microservice
 */
export class Kernel extends BaseKernel<UsersKernelServices> {
  constructor(repository: Repository, logger: Logger, broker: unknown) {
    super(broker, logger, { repository });
  }

  /**
   * Execute a class-based script
   * Note: Users service doesn't use DB transactions, so no txManager
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: UsersKernelServices) => BaseScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}

export type { UsersKernelServices, ScriptContext, TransactionScript } from "./types.js";
export { KernelError } from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
