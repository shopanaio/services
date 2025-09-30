import type {
  KernelServices,
  TransactionScript,
  Logger,
} from "./types";
import { KernelError } from "./types";

/**
 * Minimal kernel for pricing microservice
 *
 * Provides basic services for transaction scripts:
 * - Broker for calling apps.execute (centralized plugin management)
 * - Logging
 */
export class Kernel {
  private readonly services: KernelServices;

  constructor(
    broker: any,
    logger: Logger
  ) {
    this.services = {
      broker,
      logger,
    };
  }

  /**
   * Get kernel services for use in transaction scripts
   */
  getServices(): KernelServices {
    return this.services;
  }

  /**
   * Execute transaction script
   */
  async executeScript<TParams, TResult>(
    script: TransactionScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult> {
    try {
      return await script(params, this.services);
    } catch (error) {
      this.services.logger.error(
        {
          script: script.name,
          error: error instanceof Error ? error.message : String(error),
        },
        "Transaction script failed"
      );

      throw error;
    }
  }

}

// Export types for convenience
export type { KernelServices, TransactionScript } from "./types";
export { KernelError } from "./types";
