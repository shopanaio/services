import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { AppsKernelServices, SlotsRepository } from "./types";
import type { Logger } from "@shopana/shared-kernel";

/**
 * Extended kernel for apps microservice
 *
 * Extends base Kernel with apps-specific services:
 * - Slots repository for data operations
 * - Plugin manager for plugin operations
 */
export class Kernel extends BaseKernel<AppsKernelServices> {
  constructor(
    slotsRepository: SlotsRepository,
    logger: Logger,
    broker: any,
    pluginManager: any
  ) {
    super(broker, logger, {
      slotsRepository,
      pluginManager,
    });
  }
}

// Export types for convenience
export type {
  AppsKernelServices,
  ScriptContext,
  TransactionScript,
} from "./types";
export { KernelError } from "./types";
