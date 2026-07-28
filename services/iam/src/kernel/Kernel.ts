import {
  Kernel as BaseKernel,
  consoleLogger,
  hashContent,
} from "@shopana/shared-kernel";
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
import type { ApplicationAuthEmailDeliveryPort } from "../services/ApplicationAuthEmailDeliveryPort.js";
import {
  ApplicationAuthRateLimiter,
  type ApplicationAuthRateLimitPort,
} from "../services/ApplicationAuthRateLimiter.js";
import {
  ApplicationAuthAuditService,
  type ApplicationAuthAuditPort,
} from "../services/ApplicationAuthAuditService.js";
import { ApplicationTokenValidationService } from "../services/ApplicationTokenValidationService.js";
import {
  ApplicationOAuthClientManagementService,
  type ApplicationOAuthClientFirstPartyPolicy,
} from "../services/ApplicationOAuthClientManagementService.js";
import { OAuthClientSecretCodec } from "../services/OAuthClientSecretCodec.js";
import type { ApplicationAuthAdminAuditPort } from "../services/ApplicationAuthAdminAuditPort.js";
import { ApplicationAuthAdminManagementService } from "../services/ApplicationAuthAdminManagementService.js";
import { LocalApplicationAuthAdminAuditAdapter } from "../infrastructure/audit/LocalApplicationAuthAdminAuditAdapter.js";
import {
  unavailableApplicationAuthProviderValidationPort,
  type ApplicationAuthProviderValidationPort,
} from "../services/ApplicationAuthProviderValidationPort.js";
import { AuthProvider } from "./Authorizable.js";
import {
  ApplicationAuthLiveStateInvalidationBus,
  createApplicationAuthLiveStateInvalidationEvent,
  type ApplicationAuthLiveStateInvalidationPort,
} from "../events/application-auth/index.js";
import { NotificationsApplicationAuthEmailDelivery } from "../infrastructure/notifications/NotificationsApplicationAuthEmailDelivery.js";

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
  public applicationAuthRateLimiter!: ApplicationAuthRateLimiter;
  public applicationAuthAudit!: ApplicationAuthAuditService;
  public applicationOAuthClientManagement!: ApplicationOAuthClientManagementService;
  public applicationAuthAdminManagement!: ApplicationAuthAdminManagementService;
  public applicationTokenValidation!: ApplicationTokenValidationService;
  public applicationAuthLiveStateInvalidation!: ApplicationAuthLiveStateInvalidationBus;
  public applicationAuthPublicBaseUrl!: string;

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
    applicationAuthSecretRotation: ApplicationAuthSecretRotationService,
    applicationAuthRateLimiter: ApplicationAuthRateLimiter,
    applicationAuthAudit: ApplicationAuthAuditService,
    applicationAuthAdminManagement: ApplicationAuthAdminManagementService,
    applicationOAuthClientManagement: ApplicationOAuthClientManagementService,
    applicationTokenValidation: ApplicationTokenValidationService,
    applicationAuthLiveStateInvalidation: ApplicationAuthLiveStateInvalidationBus,
    applicationAuthPublicBaseUrl: string
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
    this.applicationAuthRateLimiter = applicationAuthRateLimiter;
    this.applicationAuthAudit = applicationAuthAudit;
    this.applicationAuthAdminManagement = applicationAuthAdminManagement;
    this.applicationOAuthClientManagement = applicationOAuthClientManagement;
    this.applicationTokenValidation = applicationTokenValidation;
    this.applicationAuthLiveStateInvalidation =
      applicationAuthLiveStateInvalidation;
    this.applicationAuthPublicBaseUrl = applicationAuthPublicBaseUrl;
  }

  static async create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient,
    options: {
      applicationAuthRootKeys?: ApplicationAuthRootKeyProvider;
      applicationAuthEmailDelivery?: ApplicationAuthEmailDeliveryPort;
      applicationAuthRateLimit?: ApplicationAuthRateLimitPort;
      applicationAuthAudit?: ApplicationAuthAuditPort;
      applicationAuthAdminAudit?: ApplicationAuthAdminAuditPort;
      applicationAuthProviderValidation?: ApplicationAuthProviderValidationPort;
      applicationOAuthClientFirstPartyPolicy?: ApplicationOAuthClientFirstPartyPolicy;
      applicationOAuthClientAllowedMobileSchemes?: readonly string[];
      applicationAuthLiveStateInvalidation?: ApplicationAuthLiveStateInvalidationPort;
      applicationAuthPublicBaseUrl?: string;
    } = {}
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
      options.applicationAuthRootKeys ??
        EnvironmentApplicationAuthRootKeyProvider.fromEnvironment(process.env)
    );
    const applicationAuthSecrets = new ApplicationAuthSecretService(
      applicationAuthKeyring
    );
    const applicationAuthPublicBaseUrl =
      options.applicationAuthPublicBaseUrl ?? process.env.IAM_PUBLIC_BASE_URL;
    if (!applicationAuthPublicBaseUrl) {
      throw new Error("IAM public base URL is required for token validation");
    }
    const applicationAuthLiveStateInvalidation =
      new ApplicationAuthLiveStateInvalidationBus(
        options.applicationAuthLiveStateInvalidation,
        () =>
          consoleLogger.error(
            {},
            "Application auth live-state invalidation transport failed"
          )
      );
    await applicationAuthLiveStateInvalidation.start();
    const repository = await Repository.create({
      db,
      auth,
      databaseUrl,
      applicationAuthKeyring,
      applicationAuthLiveStateInvalidation,
    });
    await repository.applicationAuthConfiguration.assertKeyringReady();
    const applicationTokenValidation = new ApplicationTokenValidationService(
      repository.applicationTokenValidation,
      applicationAuthLiveStateInvalidation,
      applicationAuthPublicBaseUrl,
      consoleLogger
    );
    const applicationAuthEmailDelivery =
      options.applicationAuthEmailDelivery ??
      new NotificationsApplicationAuthEmailDelivery(broker, repository);
    const applicationAuth = new ApplicationAuthFactory(
      applicationAuthKeyring,
      applicationAuthSecrets,
      repository.applicationAuthConfiguration,
      {
        emailDelivery: applicationAuthEmailDelivery,
        liveStateInvalidation: applicationAuthLiveStateInvalidation,
        applicationUserLifecycle: {
          async provisioningRequired(input) {
            try {
              await broker.startWorkflow(
                "iam.applicationUserCreatedEvent",
                input,
                {
                  source: "content",
                  resourceId: `${input.applicationId}:${input.applicationUserId}`,
                  operation: "applicationUserCreatedEvent",
                  contentHash: hashContent(input),
                },
              );
            } catch (error) {
              consoleLogger.error(
                {
                  applicationId: input.applicationId,
                  applicationUserId: input.applicationUserId,
                  error,
                },
                "Application user provisioning workflow could not be started",
              );
            }
          },
        },
        publicBaseUrl: applicationAuthPublicBaseUrl,
      }
    );
    const applicationAuthProvisioning = new ApplicationAuthProvisioningService(
      repository.applicationAuthConfiguration
    );
    const applicationAuthSecretRotation =
      new ApplicationAuthSecretRotationService(
        repository.applicationAuthConfiguration,
        {
          invalidate(applicationId) {
            applicationAuth.invalidate(applicationId);
            void applicationAuthLiveStateInvalidation.publish(
              createApplicationAuthLiveStateInvalidationEvent({
                kind: "application",
                applicationId,
              })
            );
          },
        }
      );
    const applicationAuthRateLimiter = new ApplicationAuthRateLimiter(
      options.applicationAuthRateLimit
    );
    const applicationAuthAudit = new ApplicationAuthAuditService(
      applicationAuthSecrets,
      consoleLogger,
      options.applicationAuthAudit
    );
    const applicationAuthAdminAudit =
      options.applicationAuthAdminAudit ??
      new LocalApplicationAuthAdminAuditAdapter(
        repository.applicationAuthAdminAudit
      );
    const applicationOAuthClientManagement =
      new ApplicationOAuthClientManagementService(
        repository.applicationOAuthClient,
        repository.txManager,
        new AuthProvider(),
        applicationAuthAdminAudit,
        {
          invalidate(applicationId, clientId) {
            applicationAuth.invalidate(applicationId);
            return applicationAuthLiveStateInvalidation.publishRequired(
              createApplicationAuthLiveStateInvalidationEvent({
                kind: "client",
                applicationId,
                clientId,
              })
            );
          },
        },
        new OAuthClientSecretCodec(),
        {
          allowedMobileSchemes:
            options.applicationOAuthClientAllowedMobileSchemes,
          firstPartyPolicy: options.applicationOAuthClientFirstPartyPolicy,
        }
      );
    const applicationAuthAdminManagement =
      new ApplicationAuthAdminManagementService(
        repository.applicationAuthAdminMutation,
        repository.applicationUser,
        repository.txManager,
        new AuthProvider(),
        applicationAuthAdminAudit,
        options.applicationAuthProviderValidation ??
          unavailableApplicationAuthProviderValidationPort,
        {
          invalidateApplication(applicationId) {
            applicationAuth.invalidate(applicationId);
            return applicationAuthLiveStateInvalidation.publishRequired(
              createApplicationAuthLiveStateInvalidationEvent({
                kind: "application",
                applicationId,
              })
            );
          },
          invalidateUser(applicationId, userId) {
            applicationAuth.invalidate(applicationId);
            return applicationAuthLiveStateInvalidation.publishRequired(
              createApplicationAuthLiveStateInvalidationEvent({
                kind: "user",
                applicationId,
                userId,
              })
            );
          },
        }
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
      applicationAuthSecretRotation,
      applicationAuthRateLimiter,
      applicationAuthAudit,
      applicationAuthAdminManagement,
      applicationOAuthClientManagement,
      applicationTokenValidation,
      applicationAuthLiveStateInvalidation,
      applicationAuthPublicBaseUrl
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
    this.applicationTokenValidation.close();
    await this.applicationAuthLiveStateInvalidation.close();
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
