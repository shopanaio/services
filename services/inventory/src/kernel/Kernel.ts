import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger, DatabaseClient } from "@shopana/shared-kernel";
import type { WorkflowRegistry } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import type { InventoryKernelServices } from "./types";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";

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

    console.log("[Inventory] Using shared database pool...");
    const db = createDatabase(dbClient);

    // Create repository with database
    console.log("[Inventory] Initializing repository...");
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
    console.log("[Inventory] Kernel initialized");
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
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: InventoryKernelServices) => BaseScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}

export type { InventoryKernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
export { BaseScript, type UserError } from "./BaseScript.js";
