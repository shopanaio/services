import {
  AuthorizationError,
  ValidationError,
  type Authorizable,
} from "@shopana/shared-kernel";
import type {
  SegmentDependency,
  SegmentDiagnostic,
} from "@shopana/customer-segment-dsl";
import { getContext } from "../context/index.js";
import { AuthProvider } from "./Authorizable.js";
import type { CustomersKernelServices } from "./types.js";

export { Transactional, ValidationError, ZodSchema } from "@shopana/shared-kernel";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
  diagnostic?: SegmentDiagnostic | null;
}

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  readonly authProvider = new AuthProvider();

  protected readonly services: CustomersKernelServices;
  protected readonly repository: CustomersKernelServices["repository"];
  protected readonly logger: CustomersKernelServices["logger"];
  protected readonly workflow: CustomersKernelServices["workflow"];
  protected readonly txManager: CustomersKernelServices["repository"]["txManager"];

  constructor(services: CustomersKernelServices) {
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
    ScriptClass: new (services: CustomersKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    return new ScriptClass(this.services).run(params);
  }

  protected invalidateDynamicSegments(
    customerId: string,
    dependencies: readonly SegmentDependency[],
    source: string,
    effectiveAt = new Date().toISOString(),
  ): Promise<number> {
    return this.repository.segmentMaterialization.enqueueCustomer(
      customerId,
      new Set(dependencies),
      `${this.context.requestId}:${source}`,
      effectiveAt,
    );
  }
}
