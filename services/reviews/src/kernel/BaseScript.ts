import {
  AuthorizationError,
  ValidationError,
  type Authorizable,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import { AuthProvider } from "./Authorizable.js";
import type { ReviewsKernelServices } from "./types.js";

export { Transactional, ValidationError, ZodSchema } from "@shopana/shared-kernel";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  readonly authProvider = new AuthProvider();

  protected readonly services: ReviewsKernelServices;
  protected readonly repository: ReviewsKernelServices["repository"];
  protected readonly logger: ReviewsKernelServices["logger"];
  protected readonly workflow: ReviewsKernelServices["workflow"];
  protected readonly txManager: ReviewsKernelServices["repository"]["txManager"];

  constructor(services: ReviewsKernelServices) {
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

  protected getProjectId(): string {
    return this.context.store.id;
  }

  protected get currentUser() {
    return this.context.user;
  }

  protected executeScript<P, R>(
    ScriptClass: new (services: ReviewsKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    return new ScriptClass(this.services).run(params);
  }
}
