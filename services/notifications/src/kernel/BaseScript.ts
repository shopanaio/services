import { AuthorizationError, ValidationError, type Authorizable } from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import { AuthProvider } from "./Authorizable.js";
import type { NotificationKernelServices } from "./types.js";

export { Transactional, ValidationError, ZodSchema } from "@shopana/shared-kernel";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  readonly authProvider = new AuthProvider();
  protected readonly repository: NotificationKernelServices["repository"];
  protected readonly logger: NotificationKernelServices["logger"];
  protected readonly workflow: NotificationKernelServices["workflow"];
  protected readonly definitions: NotificationKernelServices["definitions"];
  protected readonly renderer: NotificationKernelServices["renderer"];
  protected readonly txManager: NotificationKernelServices["repository"]["txManager"];

  constructor(protected readonly services: NotificationKernelServices) {
    this.repository = services.repository;
    this.logger = services.logger;
    this.workflow = services.workflow;
    this.definitions = services.definitions;
    this.renderer = services.renderer;
    this.txManager = services.repository.txManager;
  }

  async run(params: TParams): Promise<TResult> {
    try {
      return await this.execute(params);
    } catch (error) {
      if (!(error instanceof ValidationError) && !(error instanceof AuthorizationError)) {
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
}
