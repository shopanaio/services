import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger } from "@shopana/shared-kernel";
import {
  getServiceConfig,
  buildDatabaseUrl,
} from "@shopana/shared-service-config";
import type { ProjectKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";

const { service } = getServiceConfig("project");

const consoleLogger: Logger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
  debug: (...args: any[]) => console.debug("[DEBUG]", ...args),
};

/**
 * Extended kernel for project microservice (singleton)
 */
export class Kernel extends BaseKernel<ProjectKernelServices> {
  private static instance: Kernel | null = null;
  private repository: Repository | null = null;

  private constructor(broker: ServiceBroker, logger: Logger, repository: Repository | null) {
    super(broker, logger, { repository: repository! });
    this.repository = repository;
  }

  static async create(broker: ServiceBroker): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    const databaseUrl = service.db ? buildDatabaseUrl(service.db) : "";
    let repository: Repository | null = null;

    if (databaseUrl) {
      repository = await Repository.create({ databaseUrl });
      console.log("[PROJECT] Database connected");
    } else {
      console.warn("[PROJECT] No DATABASE_URL configured");
    }

    this.instance = new Kernel(broker, consoleLogger, repository);
    console.log("[PROJECT] Kernel initialized");
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error("Kernel not initialized. Call Kernel.create(broker) first.");
    }
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  async close(): Promise<void> {
    if (this.repository) {
      await this.repository.close();
    }
    Kernel.instance = null;
  }

  /**
   * Execute a class-based script with automatic transaction management
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: ProjectKernelServices) => BaseScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult> {
    const txManager = this.services.repository?.txManager;

    const execute = async (): Promise<TResult> => {
      const script = new ScriptClass(this.services);
      return script.run(params);
    };

    if (txManager) {
      return txManager.run(execute);
    }

    return execute();
  }
}

export type { ProjectKernelServices, ScriptContext, TransactionScript } from "./types.js";
export { KernelError } from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
