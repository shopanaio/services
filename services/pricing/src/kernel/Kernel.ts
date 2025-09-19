import type {
  KernelServices,
  TransactionScript,
  Logger,
  PluginManager,
} from "./types";
import { KernelError } from "./types";
import type { ResilienceRunner } from "@shopana/plugin-sdk";

/**
 * Minimal kernel for pricing microservice
 *
 * Provides basic services for transaction scripts:
 * - Plugin management
 * - Data access (slots)
 * - Logging
 * - Resilience (optional)
 */
export class Kernel {
  private readonly services: KernelServices;

  constructor(
    pluginManager: PluginManager,
    logger: Logger,
    broker: any,
    runner?: ResilienceRunner
  ) {
    this.services = {
      pluginManager,
      logger,
      broker,
      runner,
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

  /**
   * Get information about available plugins
   */
  async getPluginInfo() {
    try {
      const manifests = this.services.pluginManager.listManifests();
      const health = await this.services.pluginManager.health();

      return {
        manifests,
        health,
        count: manifests.length,
      };
    } catch (error) {
      this.services.logger.error({ error }, "Failed to get plugin info");
      throw new KernelError(
        "Failed to get plugin info",
        "PLUGIN_INFO_ERROR",
        error
      );
    }
  }
}

// Export types for convenience
export type { KernelServices, TransactionScript } from "./types";
export { KernelError } from "./types";
