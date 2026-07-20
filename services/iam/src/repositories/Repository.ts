import { TransactionManager } from "@shopana/shared-kernel";
import { UserRepository, type User } from "./user/UserRepository.js";
import { OrganizationRepository } from "./organization/OrganizationRepository.js";
import { ApplicationUserRepositoryFactory } from "./application-user/ApplicationUserRepository.js";
import { AuthSessionRepositoryFactory } from "./auth-session/AuthSessionRepository.js";
import { ApplicationAuthConfigurationRepository } from "./ApplicationAuthConfigurationRepository.js";
import { ApplicationAuthorizationContextRepository } from "./ApplicationAuthorizationContextRepository.js";
import { ApplicationOAuthClientRepository } from "./ApplicationOAuthClientRepository.js";
import { ApplicationTokenValidationRepository } from "./ApplicationTokenValidationRepository.js";
import { ApplicationRepository } from "./ApplicationRepository.js";
import { ApplicationAuthAdminQueryRepository } from "./ApplicationAuthAdminQueryRepository.js";
import { ApplicationAuthAdminMutationRepository } from "./ApplicationAuthAdminMutationRepository.js";
import { ApplicationAuthAdminAuditRepository } from "./ApplicationAuthAdminAuditRepository.js";
import { ServiceLinkedResourceRepository } from "./ServiceLinkedResourceRepository.js";

import { CasbinService } from "../casbin/CasbinService.js";
import type { Database } from "../infrastructure//db/database.js";
import type { Auth } from "../auth/auth.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import type { ApplicationAuthLiveStateInvalidationBus } from "../events/application-auth/index.js";

// Re-export User type
export type { User };

export interface RepositoryConfig {
  db: Database;
  auth: Auth;
  databaseUrl: string;
  applicationAuthKeyring: ApplicationAuthKeyring;
  applicationAuthLiveStateInvalidation: ApplicationAuthLiveStateInvalidationBus;
}

/**
 * Repository aggregator for IAM service.
 * Manages access to user, organization, and authorization repositories.
 */
export class Repository {
  public readonly user: UserRepository;
  public readonly applicationUser: ApplicationUserRepositoryFactory;
  public readonly authSession: AuthSessionRepositoryFactory;
  public readonly organization: OrganizationRepository;
  public readonly application: ApplicationRepository;
  public readonly applicationAuthAdminQuery: ApplicationAuthAdminQueryRepository;
  public readonly applicationAuthAdminMutation: ApplicationAuthAdminMutationRepository;
  public readonly applicationAuthAdminAudit: ApplicationAuthAdminAuditRepository;
  public readonly applicationAuthConfiguration: ApplicationAuthConfigurationRepository;
  public readonly applicationAuthorizationContext: ApplicationAuthorizationContextRepository;
  public readonly applicationOAuthClient: ApplicationOAuthClientRepository;
  public readonly applicationTokenValidation: ApplicationTokenValidationRepository;
  public readonly serviceLinkedResource: ServiceLinkedResourceRepository;
  public readonly casbin: CasbinService;
  public readonly txManager: TransactionManager<Database>;

  private constructor(
    user: UserRepository,
    applicationUser: ApplicationUserRepositoryFactory,
    authSession: AuthSessionRepositoryFactory,
    organization: OrganizationRepository,
    application: ApplicationRepository,
    applicationAuthAdminQuery: ApplicationAuthAdminQueryRepository,
    applicationAuthAdminMutation: ApplicationAuthAdminMutationRepository,
    applicationAuthAdminAudit: ApplicationAuthAdminAuditRepository,
    applicationAuthConfiguration: ApplicationAuthConfigurationRepository,
    applicationAuthorizationContext: ApplicationAuthorizationContextRepository,
    applicationOAuthClient: ApplicationOAuthClientRepository,
    applicationTokenValidation: ApplicationTokenValidationRepository,
    serviceLinkedResource: ServiceLinkedResourceRepository,
    casbin: CasbinService,
    txManager: TransactionManager<Database>
  ) {
    this.user = user;
    this.applicationUser = applicationUser;
    this.authSession = authSession;
    this.organization = organization;
    this.application = application;
    this.applicationAuthAdminQuery = applicationAuthAdminQuery;
    this.applicationAuthAdminMutation = applicationAuthAdminMutation;
    this.applicationAuthAdminAudit = applicationAuthAdminAudit;
    this.applicationAuthConfiguration = applicationAuthConfiguration;
    this.applicationAuthorizationContext = applicationAuthorizationContext;
    this.applicationOAuthClient = applicationOAuthClient;
    this.applicationTokenValidation = applicationTokenValidation;
    this.serviceLinkedResource = serviceLinkedResource;
    this.casbin = casbin;
    this.txManager = txManager;
  }

  /**
   * Create Repository with database and auth instances
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const {
      db,
      auth,
      applicationAuthKeyring,
      applicationAuthLiveStateInvalidation,
    } = config;

    // Create transaction manager
    const txManager = new TransactionManager(db);

    // Initialize Casbin service with Drizzle DB instance
    const casbinService = new CasbinService(db);
    await casbinService.initialize();

    // Create repositories
    const authSessionRepo = new AuthSessionRepositoryFactory(db, txManager);
    const userRepo = new UserRepository(db, auth, authSessionRepo);
    const applicationUserRepo = new ApplicationUserRepositoryFactory(
      db,
      txManager,
      applicationAuthLiveStateInvalidation
    );
    const organizationRepo = new OrganizationRepository(db, txManager);
    const applicationRepo = new ApplicationRepository(db, txManager);
    const applicationAuthAdminQueryRepo =
      new ApplicationAuthAdminQueryRepository(
        db,
        txManager,
        applicationAuthKeyring
      );
    const applicationAuthAdminMutationRepo =
      new ApplicationAuthAdminMutationRepository(
        db,
        txManager,
        applicationAuthKeyring
      );
    const applicationAuthAdminAuditRepo = new ApplicationAuthAdminAuditRepository(
      db,
      txManager
    );
    const applicationAuthConfigurationRepo =
      new ApplicationAuthConfigurationRepository(
        db,
        txManager,
        applicationAuthKeyring,
        applicationAuthLiveStateInvalidation
      );
    const applicationAuthorizationContextRepo =
      new ApplicationAuthorizationContextRepository(db, txManager);
    const applicationOAuthClientRepo = new ApplicationOAuthClientRepository(
      db,
      txManager
    );
    const applicationTokenValidationRepo =
      new ApplicationTokenValidationRepository(db, txManager);
    const serviceLinkedResourceRepo = new ServiceLinkedResourceRepository(
      db,
      txManager
    );

    return new Repository(
      userRepo,
      applicationUserRepo,
      authSessionRepo,
      organizationRepo,
      applicationRepo,
      applicationAuthAdminQueryRepo,
      applicationAuthAdminMutationRepo,
      applicationAuthAdminAuditRepo,
      applicationAuthConfigurationRepo,
      applicationAuthorizationContextRepo,
      applicationOAuthClientRepo,
      applicationTokenValidationRepo,
      serviceLinkedResourceRepo,
      casbinService,
      txManager
    );
  }
}
