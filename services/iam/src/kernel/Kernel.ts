import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger, DatabaseClient } from "@shopana/shared-kernel";
import type { WorkflowRegistry } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import { getServiceConfig, buildDbUrl } from "@shopana/shared-service-config";
import type { IamKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import { AuthorizationCache, NameResolver } from "../cache/index.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";
import { createAuth, type Auth } from "../auth/auth.js";
import { ApplicationAuthFactory } from "../auth/ApplicationAuthFactory.js";
import {
  ApplicationAuthKeyring,
  EnvironmentApplicationAuthRootKeyProvider,
  type ApplicationAuthRootKeyProvider,
} from "../services/ApplicationAuthKeyring.js";
import { ApplicationAuthSecretService } from "../services/ApplicationAuthSecretService.js";
import { ApplicationAuthProvisioningService } from "../services/ApplicationAuthProvisioningService.js";
import { ApplicationAuthSecretRotationService } from "../services/ApplicationAuthSecretRotationService.js";

/**
 * Extended kernel for IAM microservice (singleton)
 */
export class Kernel extends BaseKernel<IamKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public cache!: Cache;
  public authCache!: AuthorizationCache;
  public nameResolver!: NameResolver;
  public workflow!: WorkflowRegistry;
  public db!: Database;
  public auth!: Auth;
  public applicationAuth!: ApplicationAuthFactory;
  public applicationAuthKeyring!: ApplicationAuthKeyring;
  public applicationAuthSecrets!: ApplicationAuthSecretService;
  public applicationAuthProvisioning!: ApplicationAuthProvisioningService;
  public applicationAuthSecretRotation!: ApplicationAuthSecretRotationService;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    cache: Cache,
    authCache: AuthorizationCache,
    nameResolver: NameResolver,
    workflow: WorkflowRegistry,
    db: Database,
    auth: Auth,
    applicationAuth: ApplicationAuthFactory,
    applicationAuthKeyring: ApplicationAuthKeyring,
    applicationAuthSecrets: ApplicationAuthSecretService,
    applicationAuthProvisioning: ApplicationAuthProvisioningService,
    applicationAuthSecretRotation: ApplicationAuthSecretRotationService
  ) {
    super(broker, logger, { repository, cache, authCache, nameResolver, workflow });
    this.repository = repository;
    this.cache = cache;
    this.authCache = authCache;
    this.nameResolver = nameResolver;
    this.workflow = workflow;
    this.db = db;
    this.auth = auth;
    this.applicationAuth = applicationAuth;
    this.applicationAuthKeyring = applicationAuthKeyring;
    this.applicationAuthSecrets = applicationAuthSecrets;
    this.applicationAuthProvisioning = applicationAuthProvisioning;
    this.applicationAuthSecretRotation = applicationAuthSecretRotation;
  }

  static async create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient,
    applicationAuthRootKeys?: ApplicationAuthRootKeyProvider
  ): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    // Load database configuration from config.yml
    const { service } = getServiceConfig("iam");
    if (!service.db) {
      throw new Error("Database configuration is required for IAM service in config.yml");
    }
    const databaseUrl = buildDbUrl(service.db);

    const db = createDatabase(dbClient);
    const auth = createAuth();
    const applicationAuthKeyring = new ApplicationAuthKeyring(
      applicationAuthRootKeys ??
        EnvironmentApplicationAuthRootKeyProvider.fromEnvironment(process.env)
    );
    const applicationAuthSecrets = new ApplicationAuthSecretService(
      applicationAuthKeyring
    );
    const applicationAuth = new ApplicationAuthFactory(
      applicationAuthKeyring,
      applicationAuthSecrets
    );
    const repository = await Repository.create({
      db,
      auth,
      databaseUrl,
      applicationAuthKeyring,
    });
    await repository.applicationAuthConfiguration.assertKeyringReady();
    const applicationAuthProvisioning = new ApplicationAuthProvisioningService(
      repository.applicationAuthConfiguration
    );
    const applicationAuthSecretRotation =
      new ApplicationAuthSecretRotationService(
        repository.applicationAuthConfiguration,
        applicationAuth
      );

    const cache = createCache({
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
    });

    const authCache = new AuthorizationCache();
    const nameResolver = new NameResolver();

    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      cache,
      authCache,
      nameResolver,
      workflow,
      db,
      auth,
      applicationAuth,
      applicationAuthKeyring,
      applicationAuthSecrets,
      applicationAuthProvisioning,
      applicationAuthSecretRotation
    );
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
    this.applicationAuth.clear();
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
export { KernelError } from "./types.js";
export type {
  IamKernelServices,
  ScriptContext,
  TransactionScript,
  UsersKernelServices,
} from "./types.js";
