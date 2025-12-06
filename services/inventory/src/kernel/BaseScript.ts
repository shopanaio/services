import type { InventoryKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> {
  protected readonly services: InventoryKernelServices;
  protected readonly repository: InventoryKernelServices["repository"];
  protected readonly logger: InventoryKernelServices["logger"];

  constructor(services: InventoryKernelServices) {
    this.services = services;
    this.repository = services.repository;
    this.logger = services.logger;
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
    return getContext().locale ?? "uk";
  }

  /**
   * Helper: get current project ID
   */
  protected getProjectId(): string {
    return getContext().project.id;
  }

  /**
   * Helper: execute another script (composition)
   */
  protected executeScript<P, R>(
    ScriptClass: new (services: InventoryKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}
