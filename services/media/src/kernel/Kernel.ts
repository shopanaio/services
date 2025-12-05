import type { Logger } from "@shopana/shared-kernel";
import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { Repository } from "../repositories";
import type { MediaKernelServices } from "./types";

/**
 * Extended kernel for media microservice
 */
export class Kernel extends BaseKernel<MediaKernelServices> {
  constructor(repository: Repository, logger: Logger, broker: any) {
    super(broker, logger, { repository });
  }
}

export { KernelError } from "./types";
export type {
  MediaKernelServices,
  ScriptContext,
  TransactionScript,
} from "./types";
