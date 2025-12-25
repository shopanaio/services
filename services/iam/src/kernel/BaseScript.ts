import {
  ValidationError,
  type UserError,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { IamKernelServices } from "./types.js";

// Re-export from shared-kernel for convenience
export { ZodSchema, ValidationError, type UserError } from "@shopana/shared-kernel";

export abstract class BaseScript<TParams, TResult> {
  protected readonly services: IamKernelServices;
  protected readonly repository: IamKernelServices["repository"];
  protected readonly logger: IamKernelServices["logger"];
  protected readonly authCache: IamKernelServices["authCache"];

  constructor(services: IamKernelServices) {
    this.services = services;
    this.repository = services.repository;
    this.logger = services.logger;
    this.authCache = services.authCache;
  }

  /**
   * Main entry point - wraps execute with error handling
   */
  async run(params: TParams): Promise<TResult> {
    try {
      return await this.execute(params);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
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
  protected getLocale(): string {
    return "en"; // Default locale
  }

  /**
   * Helper: get current organization ID (from JWT)
   */
  protected getOrganizationId(): string | null {
    return this.context.organizationId ?? null;
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
