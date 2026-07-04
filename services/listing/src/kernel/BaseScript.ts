import {
  AuthorizationError,
  ValidationError,
  type Authorizable,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { ListingKernelServices } from "./types.js";
import { AuthProvider } from "./Authorizable.js";

export { Transactional, ValidationError, ZodSchema } from "@shopana/shared-kernel";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  readonly authProvider = new AuthProvider();

  protected readonly services: ListingKernelServices;
  protected readonly repository: ListingKernelServices["repository"];
  protected readonly logger: ListingKernelServices["logger"];
  protected readonly workflow: ListingKernelServices["workflow"];
  protected readonly txManager: ListingKernelServices["repository"]["txManager"];

  constructor(services: ListingKernelServices) {
    this.services = services;
    this.repository = services.repository;
    this.logger = services.logger;
    this.workflow = services.workflow;
    this.txManager = services.repository.txManager;
  }

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

  protected abstract execute(params: TParams): Promise<TResult>;

  protected abstract handleError(error: unknown): TResult;

  protected get context() {
    return getContext();
  }

  protected getLocale(): string {
    return this.context.locale ?? this.context.store.defaultLocale;
  }

  protected getProjectId(): string {
    return this.context.store.id;
  }

  protected get currentUser() {
    return this.context.user;
  }

  protected executeScript<P, R>(
    ScriptClass: new (services: ListingKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}
