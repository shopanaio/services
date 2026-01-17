import {
  ValidationError,
  AuthorizationError,
  ZodSchema,
  Transactional,
  type Authorizable,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { MediaKernelServices } from "./types.js";
import { AuthProvider } from "./Authorizable.js";

// Re-export decorators for convenience
export { ZodSchema, Transactional, ValidationError };

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  /**
   * Authorization provider for @Policy decorator.
   */
  readonly authProvider = new AuthProvider();

  protected readonly services: MediaKernelServices;
  protected readonly repository: MediaKernelServices["repository"];
  protected readonly logger: MediaKernelServices["logger"];
  protected readonly workflow: MediaKernelServices["workflow"];

  /**
   * Transaction manager for @Transactional() decorator
   * Required by the decorator contract
   */
  protected readonly txManager: MediaKernelServices["repository"]["txManager"];

  constructor(services: MediaKernelServices) {
    this.services = services;
    this.repository = services.repository;
    this.logger = services.logger;
    this.workflow = services.workflow;
    this.txManager = services.repository.txManager;
  }

  /**
   * Main entry point - wraps execute with error handling
   */
  async run(params: TParams): Promise<TResult> {
    try {
      return await this.execute(params);
    } catch (error) {
      if (
        !(error instanceof ValidationError) &&
        !(error instanceof AuthorizationError)
      ) {
        this.logger.error({ error }, `${this.constructor.name} failed`);
      }
      return this.handleError(error);
    }
  }

  /**
   * Override in subclass - main business logic
   */
  protected abstract execute(params: TParams): Promise<TResult>;

  /**
   * Override in subclass - error handling.
   * Check for ValidationError to return validation errors.
   */
  protected abstract handleError(error: unknown): TResult;

  /**
   * Helper: get current service context
   */
  protected get context() {
    return getContext();
  }

  /**
   * Helper: get current store ID
   */
  protected get storeId(): string {
    return this.context.store.id;
  }

  /**
   * Helper: get current user (throws if not authenticated)
   */
  protected get currentUser() {
    return this.context.user;
  }

  /**
   * Helper: execute another script (composition)
   */
  protected executeScript<P, R>(
    ScriptClass: new (services: MediaKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}
