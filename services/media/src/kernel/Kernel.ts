import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { MediaKernelServices } from "./types";
import type { Logger } from "@shopana/shared-kernel";
import type { Repository } from "../repositories";

/**
 * Extended kernel for media microservice
 */
export class Kernel extends BaseKernel<MediaKernelServices> {
  constructor(repository: Repository, logger: Logger, broker: any) {
    super(broker, logger, { repository });
  }
}

export type { MediaKernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
