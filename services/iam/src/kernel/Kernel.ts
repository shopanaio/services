import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import { getServiceConfig, buildDbUrl } from "@shopana/shared-service-config";
import type { IamKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { AuthorizationCache, NameResolver } from "../cache/index.js";
import { initDatabase, type Database } from "../infrastructure/db/database.js";
import { createAuth, type Auth } from "../auth/auth.js";
import { ResourceAggregator } from "../resources/index.js";

/**
 * Extended kernel for IAM microservice (singleton)
 */
export class Kernel extends BaseKernel<IamKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public cache!: Cache;
  public authCache!: AuthorizationCache;
  public nameResolver!: NameResolver;
  public db!: Database;
  public auth!: Auth;
  public resourceAggregator!: ResourceAggregator;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    cache: Cache,
    authCache: AuthorizationCache,
    nameResolver: NameResolver,
    db: Database,
    auth: Auth,
    resourceAggregator: ResourceAggregator
  ) {
    super(broker, logger, { repository, cache, authCache, nameResolver });
    this.repository = repository;
    this.cache = cache;
    this.authCache = authCache;
    this.nameResolver = nameResolver;
    this.db = db;
    this.auth = auth;
    this.resourceAggregator = resourceAggregator;
  }

  static async create(broker: ServiceBroker): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    // Load database configuration from config.yml
    const { service } = getServiceConfig("iam");
    if (!service.db) {
      throw new Error("Database configuration is required for IAM service in config.yml");
    }
    const databaseUrl = buildDbUrl(service.db);

    console.log("[IAM] Initializing database connection...");
    const db = initDatabase(databaseUrl);

    // Initialize Better Auth
    console.log("[IAM] Initializing Better Auth...");
    const auth = createAuth();

    // Create repository with database, auth, and casbin
    console.log("[IAM] Initializing Casbin authorization...");
    const repository = await Repository.create({ db, auth, databaseUrl });

    const cache = createCache({
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
    });

    const authCache = new AuthorizationCache();
    const nameResolver = new NameResolver();
    const resourceAggregator = new ResourceAggregator(broker);

    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      cache,
      authCache,
      nameResolver,
      db,
      auth,
      resourceAggregator
    );
    console.log("[IAM] Kernel initialized with Better Auth and Casbin");
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

export { BaseScript } from "./BaseScript.js";
export { type UserError } from "@shopana/shared-kernel";
export { Authorizable } from "./Authorizable.js";
export { KernelError } from "./types.js";
export type {
  IamKernelServices,
  ScriptContext,
  TransactionScript,
  UsersKernelServices,
} from "./types.js";
