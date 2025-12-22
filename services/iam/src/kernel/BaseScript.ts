import { getContext } from "../context/index.js";
import type { IamKernelServices } from "./types.js";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

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
      this.logger.error({ error }, `${this.constructor.name} failed`);
      return this.handleError(error);
    }
  }

  /**
   * Override in subclass - main business logic
   */
  protected abstract execute(params: TParams): Promise<TResult>;

  /**
   * Override in subclass - error handling
   */
  protected abstract handleError(error: unknown): TResult;

  /**
   * Helper: get current locale
   */
  protected getLocale(): string {
    return "en"; // Default locale
  }

  /**
   * Helper: get current tenant ID (project slug)
   */
  protected getTenantId(): string | null {
    return getContext()?.tenantId ?? null;
  }

  /**
   * Helper: get current project slug
   */
  protected getProjectSlug(): string | null {
    return getContext()?.projectSlug ?? null;
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
