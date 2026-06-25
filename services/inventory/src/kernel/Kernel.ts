import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger, DatabaseClient } from "@shopana/shared-kernel";
import type { WorkflowRegistry } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import type { InventoryKernelServices, RunScriptContext } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";
import { runWithContext, getContextSafe, ServiceContext } from "../context/index.js";
import { Loader } from "../loaders/Loader.js";

/**
 * Extended kernel for inventory microservice (singleton)
 */
export class Kernel extends BaseKernel<InventoryKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public cache!: Cache;
  public db!: Database;
  public workflow!: WorkflowRegistry;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    cache: Cache,
    db: Database
  ) {
    super(broker, logger, { repository, workflow, cache });
    this.repository = repository;
    this.workflow = workflow;
    this.cache = cache;
    this.db = db;
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

    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      workflow,
      cache,
      db
    );
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error(
        "Kernel not initialized. Call Kernel.create(broker, workflow, dbClient) first."
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
   * Execute a class-based script.
   * Use @Transactional() decorator on execute() method for transaction support.
   *
   * @param ScriptClass - Script class to instantiate and run
   * @param params - Parameters for the script
   * @param context - Optional context for workflow calls (when AsyncLocalStorage is not available)
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: InventoryKernelServices) => BaseScript<TParams, TResult>,
    params: TParams,
    context?: RunScriptContext
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);

    // If context is provided and AsyncLocalStorage is empty, wrap in context
    if (context && !getContextSafe()) {
      const serviceContext = this.buildServiceContext(context);
      return runWithContext(serviceContext, () => script.run(params));
    }

    return script.run(params);
  }

  /**
   * Build minimal ServiceContext from RunScriptContext.
   * Used when running scripts from workflows where AsyncLocalStorage is not available.
   */
  private buildServiceContext(ctx: RunScriptContext): ServiceContext {
    return new ServiceContext({
      requestId: `workflow-${Date.now()}`,
      kernel: this,
      loaders: new Loader(this.repository),
      locale: ctx.locale,
      store: {
        id: ctx.storeId,
        name: ctx.storeId,
        displayName: ctx.storeId,
        organizationId: ctx.organizationId,
        timezone: "UTC",
        email: null,
        defaultLocale: this.resolveDefaultLocale(ctx),
        defaultCurrency: "UAH",
      },
      user: ctx.userId
        ? { id: ctx.userId, name: "workflow-user" }
        : undefined,
    });
  }

  private resolveDefaultLocale(ctx: RunScriptContext): string {
    const defaultLocale = ctx.defaultLocale ?? ctx.locale;
    if (!defaultLocale) {
      throw new Error("RunScriptContext requires defaultLocale or locale");
    }
    return defaultLocale;
  }
}

export type { InventoryKernelServices, ScriptContext, TransactionScript, RunScriptContext } from "./types.js";
export { KernelError } from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
