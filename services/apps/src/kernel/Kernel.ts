import type {
  KernelServices,
  ScriptContext,
  TransactionScript,
  Logger,
  SlotsRepository,
} from "./types";

/**
 * Minimal kernel for addons microservice
 *
 * Simplified without correlation dependencies - relies on Moleculer for tracing
 * Provides basic services for transaction scripts:
 * - Slots repository for data operations
 * - HTTP client for external APIs
 * - Logging
 */
export class Kernel {
  private readonly services: KernelServices;

  constructor(
    slotsRepository: SlotsRepository,
    logger: Logger,
    broker: any,
    pluginManager: any
  ) {
    this.services = {
      slotsRepository,
      logger,
      broker,
      pluginManager,
    };
  }

  /**
   * Get kernel services for use in transaction scripts
   */
  getServices(): KernelServices {
    return this.services;
  }

  /**
   * Execute transaction script with simplified context
   * No correlation generation - Moleculer handles tracing internally
   */
  async executeScript<TParams, TResult>(
    script: TransactionScript<TParams, TResult>,
    params: TParams,
    context: Partial<ScriptContext> = {}
  ): Promise<TResult> {
    const fullContext: ScriptContext = {
      requestId: context.requestId || this.generateRequestId(),
      projectId: context.projectId || "",
      startTime: Date.now(),
    };

    this.services.logger.debug(
      {
        script: script.name,
        context: fullContext,
        params,
      },
      "Executing transaction script"
    );

    try {
      const result = await script(params, this.services, fullContext);

      this.services.logger.debug(
        {
          script: script.name,
          context: fullContext,
          duration: Date.now() - fullContext.startTime,
        },
        "Transaction script completed"
      );

      return result;
    } catch (error) {
      this.services.logger.error(
        {
          script: script.name,
          context: fullContext,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - fullContext.startTime,
        },
        "Transaction script failed"
      );

      throw error;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export types for convenience
export type { KernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
