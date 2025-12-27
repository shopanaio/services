import {
  ValidationError,
  AuthorizationError,
  type Authorizable,
} from "@shopana/shared-kernel";
import type { ProjectKernelServices } from "./types.js";
import { getContext } from "../context/index.js";
import { AuthProvider } from "@src/kernel/Authorizable.js";

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  /**
   * Authorization provider for @Policy decorator.
   */
  readonly authProvider = new AuthProvider();

  protected readonly services: ProjectKernelServices;
  protected readonly repository: ProjectKernelServices["repository"];
  protected readonly logger: ProjectKernelServices["logger"];
  protected readonly broker: ProjectKernelServices["broker"];

  /**
   * Transaction manager for @Transactional() decorator
   */
  protected readonly txManager: ProjectKernelServices["repository"]["txManager"];

  constructor(services: ProjectKernelServices) {
    this.services = services;
    this.repository = services.repository;
    this.logger = services.logger;
    this.broker = services.broker;
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
   * Check for ValidationError/AuthorizationError to return errors.
   */
  protected abstract handleError(error: unknown): TResult;

  /**
   * Helper: get current service context
   */
  protected get context() {
    return getContext();
  }

  /**
   * Helper: get current locale
   */
  protected getLocale(): string {
    return this.context.locale ?? "uk";
  }

  /**
   * Helper: execute another script (composition)
   */
  protected executeScript<P, R>(
    ScriptClass: new (services: ProjectKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}
