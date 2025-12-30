import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import { getServiceConfig, buildDatabaseUrl } from "@shopana/shared-service-config";
import type { InventoryKernelServices } from "./types";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { initDatabase, type Database } from "../infrastructure/db/database.js";

/**
 * Extended kernel for inventory microservice (singleton)
 */
export class Kernel extends BaseKernel<InventoryKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public cache!: Cache;
  public db!: Database;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    cache: Cache,
    db: Database
  ) {
    super(broker, logger, { repository });
    this.repository = repository;
    this.cache = cache;
    this.db = db;
  }

  static async create(broker: ServiceBroker): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    // Load database configuration from config.yml
    const { service } = getServiceConfig("inventory");
    if (!service.db) {
      throw new Error("Database configuration is required for inventory service in config.yml");
    }
    const databaseUrl = buildDatabaseUrl(service.db);

    console.log("[Inventory] Initializing database connection...");
    const db = initDatabase(databaseUrl);

    // Create repository with database
    console.log("[Inventory] Initializing repository...");
    const repository = new Repository(databaseUrl);

    const cache = createCache({
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
    });

    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      cache,
      db
    );
    console.log("[Inventory] Kernel initialized");
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
    ScriptClass: new (services: InventoryKernelServices) => BaseScript<TParams, TResult>,
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

export type { InventoryKernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
export { BaseScript, type UserError } from "./BaseScript.js";
