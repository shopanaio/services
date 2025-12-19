import type { IdentityKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> {
  protected readonly services: IdentityKernelServices;
  protected readonly casdoorAdapter: IdentityKernelServices["casdoorAdapter"];
  protected readonly logger: IdentityKernelServices["logger"];
  protected readonly broker: IdentityKernelServices["broker"];

  constructor(services: IdentityKernelServices) {
    this.services = services;
    this.casdoorAdapter = services.casdoorAdapter;
    this.logger = services.logger;
    this.broker = services.broker;
  }

  async run(params: TParams): Promise<TResult> {
    try {
      return await this.execute(params);
    } catch (error) {
      this.logger.error({ error }, `${this.constructor.name} failed`);
      return this.handleError(error);
    }
  }

  protected abstract execute(params: TParams): Promise<TResult>;
  protected abstract handleError(error: unknown): TResult;

  protected getContext() {
    return getContext();
  }

  protected executeScript<P, R>(
    ScriptClass: new (services: IdentityKernelServices) => BaseScript<P, R>,
    params: P
  ): Promise<R> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}
