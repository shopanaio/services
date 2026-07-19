import { TransactionManager } from "@shopana/shared-kernel";
import { UserRepository, type User } from "./user/UserRepository.js";
import { OrganizationRepository } from "./organization/OrganizationRepository.js";
import { ApplicationUserRepositoryFactory } from "./application-user/ApplicationUserRepository.js";
import { AuthSessionRepositoryFactory } from "./auth-session/AuthSessionRepository.js";
import { ApplicationAuthConfigurationRepository } from "./ApplicationAuthConfigurationRepository.js";
import { ApplicationAuthorizationContextRepository } from "./ApplicationAuthorizationContextRepository.js";

import { CasbinService } from "../casbin/CasbinService.js";
import type { Database } from "../infrastructure//db/database.js";
import type { Auth } from "../auth/auth.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";

// Re-export User type
export type { User };

export interface RepositoryConfig {
  db: Database;
  auth: Auth;
  databaseUrl: string;
  applicationAuthKeyring: ApplicationAuthKeyring;
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
  public readonly applicationAuthConfiguration: ApplicationAuthConfigurationRepository;
  public readonly applicationAuthorizationContext: ApplicationAuthorizationContextRepository;
  public readonly casbin: CasbinService;
  public readonly txManager: TransactionManager<Database>;

  private constructor(
    user: UserRepository,
    applicationUser: ApplicationUserRepositoryFactory,
    authSession: AuthSessionRepositoryFactory,
    organization: OrganizationRepository,
    applicationAuthConfiguration: ApplicationAuthConfigurationRepository,
    applicationAuthorizationContext: ApplicationAuthorizationContextRepository,
    casbin: CasbinService,
    txManager: TransactionManager<Database>
  ) {
    this.user = user;
    this.applicationUser = applicationUser;
    this.authSession = authSession;
    this.organization = organization;
    this.applicationAuthConfiguration = applicationAuthConfiguration;
    this.applicationAuthorizationContext = applicationAuthorizationContext;
    this.casbin = casbin;
    this.txManager = txManager;
  }

  /**
   * Create Repository with database and auth instances
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db, auth, applicationAuthKeyring } = config;

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
      txManager
    );
    const organizationRepo = new OrganizationRepository(db, txManager);
    const applicationAuthConfigurationRepo =
      new ApplicationAuthConfigurationRepository(
        db,
        txManager,
        applicationAuthKeyring
      );
    const applicationAuthorizationContextRepo =
      new ApplicationAuthorizationContextRepository(db, txManager);

    return new Repository(
      userRepo,
      applicationUserRepo,
      authSessionRepo,
      organizationRepo,
      applicationAuthConfigurationRepo,
      applicationAuthorizationContextRepo,
      casbinService,
      txManager
    );
  }
}
