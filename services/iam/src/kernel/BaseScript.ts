import {
  ValidationError,
  AuthorizationError,
  ZodSchema,
  Transactional,
  type Authorizable,
  type UserError,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { IamKernelServices } from "./types.js";
import { AuthProvider } from "@src/kernel/Authorizable.js";

// Re-export decorators for convenience
export { ZodSchema, Transactional, ValidationError, AuthorizationError };
export type { UserError };

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  /**
   * Authorization provider for @Policy decorator.
   */
  readonly authProvider = new AuthProvider();

  protected readonly services: IamKernelServices;
  protected readonly repository: IamKernelServices["repository"];
  protected readonly logger: IamKernelServices["logger"];
  protected readonly authCache: IamKernelServices["authCache"];

  /**
   * Transaction manager for @Transactional() decorator
   * Required by the decorator contract
   */
  protected readonly txManager: IamKernelServices["repository"]["txManager"];

  constructor(services: IamKernelServices) {
    this.services = services;
    this.repository = services.repository;
    this.logger = services.logger;
    this.authCache = services.authCache;
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
   * Helper: get current user (throws if not authenticated)
   */
  protected get currentUser() {
    const user = this.context.currentUser;
    if (!user || !user.id) {
      throw new AuthorizationError(
        [{ code: "UNAUTHORIZED", message: "User not authenticated", field: null }],
        "user",
        "authenticate"
      );
    }
    return user;
  }

  /**
   * Helper: get current locale
   */
  protected get locale(): string {
    return "en"; // Default locale
  }

  /**
   * Helper: execute another script (composition)
   */
  protected executeScript<P, R>(
    ScriptClass: new (services: IamKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}
