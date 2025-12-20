import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { IamKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";

const { service } = getServiceConfig("iam");

const consoleLogger: Logger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
  debug: (...args: any[]) => console.debug("[DEBUG]", ...args),
};

/**
 * Extended kernel for IAM microservice (singleton)
 */
export class Kernel extends BaseKernel<IamKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository
  ) {
    super(broker, logger, { repository });
    this.repository = repository;
  }

  static async create(broker: ServiceBroker): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    const casdoor = service.casdoor;
    if (!casdoor) {
      throw new Error("Casdoor config is required for IAM service");
    }

    const repository = await Repository.create({
      endpoint: casdoor.endpoint,
      clientId: casdoor.client_id,
      clientSecret: casdoor.client_secret,
      certificate: casdoor.certificate,
      organizationName: casdoor.organization_name,
      applicationName: casdoor.application_name,
    });

    this.instance = new Kernel(broker, consoleLogger, repository);
    console.log("[IAM] Kernel initialized");
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error(
        "Kernel not initialized. Call Kernel.create(broker) first."
      );
    }
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  async close(): Promise<void> {
    Kernel.instance = null;
  }

  /**
   * Execute a class-based script
   * Note: IAM service doesn't use DB transactions, so no txManager
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: IamKernelServices) => BaseScript<
      TParams,
      TResult
    >,
    params: TParams
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}

export { BaseScript, type UserError } from "./BaseScript.js";
export { KernelError } from "./types.js";
export type {
  IamKernelServices,
  ScriptContext,
  TransactionScript,
  UsersKernelServices,
} from "./types.js";
