import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import { getServiceConfig, buildDatabaseUrl } from "@shopana/shared-service-config";
import type { MediaKernelServices } from "./types";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { initDatabase, type Database } from "../infrastructure/db/database.js";

/**
 * Extended kernel for media microservice (singleton)
 */
export class Kernel extends BaseKernel<MediaKernelServices> {
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
    super(broker, logger, { repository, cache });
    this.repository = repository;
    this.cache = cache;
    this.db = db;
  }

  static async create(broker: ServiceBroker): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    // Load database configuration from config.yml
    const { service } = getServiceConfig("media");
    if (!service.db) {
      throw new Error("Database configuration is required for media service in config.yml");
    }
    const databaseUrl = buildDatabaseUrl(service.db);

    console.log("[Media] Initializing database connection...");
    const db = initDatabase(databaseUrl);

    // Create repository with database
    console.log("[Media] Initializing repository...");
    const repository = await Repository.create({ db });

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
    console.log("[Media] Kernel initialized");
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
   * Execute a class-based script.
   * Use @Transactional() decorator on execute() method for transaction support.
   */
  async runScript<TParams, TResult>(
    ScriptClass: new (services: MediaKernelServices) => BaseScript<TParams, TResult>,
    params: TParams
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    return script.run(params);
  }
}

export type { MediaKernelServices, ScriptContext, TransactionScript } from "./types";
export { KernelError } from "./types";
export { BaseScript, type UserError } from "./BaseScript.js";
