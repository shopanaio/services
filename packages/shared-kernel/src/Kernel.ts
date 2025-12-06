import type {
  BaseKernelServices,
  KernelServices,
  TransactionScript,
  ScriptContext,
  Logger,
} from "./types";

/**
 * Base Microkernel for microservices
 *
 * Implements minimal kernel architecture that provides basic services
 * for transaction scripts:
 * - Broker for inter-service communication (calls to apps.execute, etc.)
 * - Logging infrastructure
 * - Script context support for request tracking
 * - Automatic transaction management (if repository with txManager is provided)
 *
 * The kernel acts as a dependency injection container and executor
 * for transaction scripts, following the Transaction Script pattern.
 *
 * Can be extended with additional services by providing custom KernelServices type.
 *
 * @template TServices - Extended kernel services type (defaults to BaseKernelServices)
 */
export class Kernel<TServices extends BaseKernelServices = BaseKernelServices> {
  protected readonly services: TServices;

  constructor(
    broker: any,
    logger: Logger,
    additionalServices?: Omit<TServices, keyof BaseKernelServices>
  ) {
    this.services = {
      broker,
      logger,
      ...additionalServices,
    } as TServices;
  }

  /**
   * Get kernel services for use in transaction scripts
   * Provides access to broker, logger and any additional services
   */
  getServices(): TServices {
    return this.services;
  }

  /**
   * Execute a transaction script with automatic transaction management
   *
   * If services contain a repository with txManager, the script will be
   * wrapped in a database transaction:
   * - On success: automatic COMMIT
   * - On error: automatic ROLLBACK + error logged + error rethrown
   *
   * Nested calls reuse the existing transaction (no new transaction created).
   *
   * @param script - The transaction script to execute
   * @param params - Parameters for the script
   * @param context - Optional execution context for tracking and metadata
   * @returns Result from the script execution
   * @throws Re-throws any errors after logging them
   */
  async executeScript<TParams, TResult>(
    script: TransactionScript<TParams, TResult, TServices>,
    params: TParams,
    context: Partial<ScriptContext> = {}
  ): Promise<TResult> {
    const fullContext: ScriptContext = {
      requestId: context.requestId || this.generateRequestId(),
      projectId: context.projectId,
      startTime: Date.now(),
      metadata: context.metadata,
    };

    this.services.logger.debug(
      {
        script: script.name,
        context: fullContext,
        params,
      },
      "Executing transaction script"
    );

    // Get txManager from services (if repository exists)
    const txManager = (this.services as any).repository?.txManager;

    const execute = async (): Promise<TResult> => {
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
    };

    // If txManager exists, wrap in transaction
    // On success: COMMIT, on error: ROLLBACK + log + throw
    if (txManager) {
      return txManager.run(execute);
    }

    // Fallback: execute without transaction
    return execute();
  }

  /**
   * Execute a transaction script WITHOUT transaction wrapper
   * Use for read-only operations or when transaction is not needed
   */
  async executeScriptReadOnly<TParams, TResult>(
    script: TransactionScript<TParams, TResult, TServices>,
    params: TParams,
    context: Partial<ScriptContext> = {}
  ): Promise<TResult> {
    const fullContext: ScriptContext = {
      requestId: context.requestId || this.generateRequestId(),
      projectId: context.projectId,
      startTime: Date.now(),
      metadata: context.metadata,
    };

    return script(params, this.services, fullContext);
  }

  /**
   * Generate unique request ID for tracking
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
