import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { IdentityKernelServices } from "./types.js";
import type { Logger } from "@shopana/shared-kernel";
import type { CasdoorAdapter } from "../adapters/casdoor/CasdoorAdapter.js";
import { BaseScript } from "./BaseScript.js";

export class Kernel extends BaseKernel<IdentityKernelServices> {
  constructor(
    casdoorAdapter: CasdoorAdapter | null,
    logger: Logger,
    broker: any
  ) {
    super(broker, logger, { casdoorAdapter });
  }

  async runScript<TParams, TResult>(
    ScriptClass: new (services: IdentityKernelServices) => BaseScript<
      TParams,
      TResult
    >,
    params: TParams
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}

export type {
  IdentityKernelServices,
  ScriptContext,
  TransactionScript,
} from "./types.js";
export { KernelError } from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
