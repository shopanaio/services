import {
  ValidationError,
  AuthorizationError,
  type Authorizable,
  type AuthorizeParams,
  type AuthorizeResult,
} from "@shopana/shared-kernel";
import type { ProjectKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

export abstract class BaseScript<TParams, TResult> implements Authorizable {
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
   * Current user ID for @Authorize decorator
   */
  get userId(): string | null {
    return this.context.user?.id ?? null;
  }

  /**
   * Organization ID for @Authorize decorator.
   * From x-organization-id header or store context.
   */
  get organizationId(): string | null {
    return (
      this.context.organizationId ?? this.context.store?.organizationId ?? null
    );
  }

  /**
   * Authorization check for @Authorize decorator
   */
  async authorize(params: AuthorizeParams): Promise<AuthorizeResult> {
    // Auto-detect domain: explicit > store context > org (default)
    const domain =
      params.domain ?? (this.context.store ? `store:${this.context.store.id}` : undefined);

    return this.broker.call("iam.authorize", {
      userId: this.userId,
      organizationId: params.organizationId,
      resource: params.resource,
      action: params.action,
      domain,
    }) as Promise<AuthorizeResult>;
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
   * Helper: get current store ID
   * @throws Error if no store in context
   */
  protected getStoreId(): string {
    if (!this.context.store) {
      throw new Error("Store context required");
    }
    return this.context.store.id;
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
