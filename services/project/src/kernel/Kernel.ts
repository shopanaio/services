import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, DatabaseClient, Logger } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import type { WorkflowRegistry } from "@shopana/shared-kernel";
import type { ProjectKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { NameResolver } from "../cache/index.js";
import { createDatabase } from "../infrastructure/db/database.js";

/**
 * Extended kernel for project microservice (singleton)
 */
export class Kernel extends BaseKernel<ProjectKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;

  public workflow!: WorkflowRegistry;

  public cache!: Cache;

  public nameResolver!: NameResolver;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    cache: Cache,
    nameResolver: NameResolver
  ) {
    super(broker, logger, { repository, workflow, cache, nameResolver });
    this.repository = repository;
    this.workflow = workflow;
    this.cache = cache;
    this.nameResolver = nameResolver;
  }

  static async create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient
  ): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    const db = createDatabase(dbClient);
    const repository = await Repository.create({ db });

    const cache = createCache({
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
    });

    const nameResolver = new NameResolver();

    this.instance = new Kernel(broker, consoleLogger, repository, workflow, cache, nameResolver);
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
    if (this.repository) {
      await this.repository.close();
    }
    Kernel.instance = null;
  }

  /**
   * Execute a class-based script with automatic transaction management
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: ProjectKernelServices) => BaseScript<
      TParams,
      TResult
    >,
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

export type {
  ProjectKernelServices,
  ScriptContext,
  TransactionScript,
} from "./types.js";
export { KernelError } from "./types.js";
export { BaseScript } from "./BaseScript.js";
export { type UserError } from "@shopana/shared-kernel";
