import type { Logger } from "@shopana/shared-kernel";
import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { Repository } from "../repositories/index.js";
import { BaseScript } from "./BaseScript.js";
import type { UsersKernelServices } from "./types.js";

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
    ScriptClass: new (services: UsersKernelServices) => BaseScript<
      TParams,
      TResult
    >,
    params: TParams
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}

export { BaseScript, type UserError } from "./BaseScript.js";
export { KernelError } from "./types.js";
export type {
  ScriptContext,
  TransactionScript,
  UsersKernelServices,
} from "./types.js";
