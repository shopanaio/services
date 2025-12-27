import {
  ValidationError,
  AuthorizationError,
  ZodSchema,
  Transactional,
  type Authorizable,
  type AuthorizeParams,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { IamKernelServices } from "./types.js";
import { ORG_DOMAIN, type Resource } from "../casbin/CasbinService.js";

// Re-export decorators for convenience
export { ZodSchema, Transactional, ValidationError };

export abstract class BaseScript<TParams, TResult> implements Authorizable {
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
   * Current user ID for @Policy decorator
   */
  get userId(): string | null {
    return this.context.currentUser?.id ?? null;
  }

  /**
   * Authorization check for @Policy decorator.
   * Uses Casbin directly since we're in the IAM service.
   */
  async authorize(params: AuthorizeParams): Promise<boolean> {
    const userId = this.userId;
    if (!userId) {
      return false;
    }

    // Check if user is site admin (bypasses all checks)
    const isAdmin = await this.repository.user.isAdmin(userId);
    if (isAdmin) {
      return true;
    }

    // Check permission using Casbin RBAC
    return this.repository.casbin.enforce({
      organizationId: params.organizationId,
      userId,
      domain: ORG_DOMAIN,
      resource: params.resource as Resource,
      action: params.action,
    });
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
    if (!user) {
      throw new Error("User not authenticated");
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
