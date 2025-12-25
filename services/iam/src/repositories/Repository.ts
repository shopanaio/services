import { TransactionManager } from "@shopana/shared-kernel";
import { UserRepository, type User } from "./user/UserRepository.js";
import { OrganizationRepository } from "./organization/OrganizationRepository.js";

import { CasbinService } from "../casbin/CasbinService.js";
import type { Database } from "../infrastructure//db/database.js";
import type { Auth } from "../auth/auth.js";

// Re-export User type
export type { User };

export interface RepositoryConfig {
  db: Database;
  auth: Auth;
  databaseUrl: string;
}

/**
 * Repository aggregator for IAM service.
 * Manages access to user, organization, and authorization repositories.
 */
export class Repository {
  public readonly user: UserRepository;
  public readonly organization: OrganizationRepository;
  public readonly casbin: CasbinService;
  public readonly txManager: TransactionManager<Database>;

  private constructor(
    user: UserRepository,
    organization: OrganizationRepository,
    casbin: CasbinService,
    txManager: TransactionManager<Database>
  ) {
    this.user = user;
    this.organization = organization;
    this.casbin = casbin;
    this.txManager = txManager;
  }

  /**
   * Create Repository with database and auth instances
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db, auth } = config;

    // Create transaction manager
    const txManager = new TransactionManager(db);

    // Initialize Casbin service with Drizzle DB instance
    const casbinService = new CasbinService(db);
    await casbinService.initialize();

    // Create repositories
    const userRepo = new UserRepository(db, auth);
    const organizationRepo = new OrganizationRepository(db, txManager);

    return new Repository(userRepo, organizationRepo, casbinService, txManager);
  }
}
