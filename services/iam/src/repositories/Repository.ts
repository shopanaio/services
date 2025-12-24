import { UserRepository, type User } from "./user/UserRepository.js";

import { CasbinService } from "../casbin/CasbinService.js";
import type { Database } from "../db/database.js";
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
  public readonly casbin: CasbinService;

  private constructor(
    user: UserRepository,

    casbin: CasbinService
  ) {
    this.user = user;
    this.casbin = casbin;
  }

  /**
   * Create Repository with database and auth instances
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db, auth } = config;

    // Initialize Casbin service with Drizzle DB instance
    const casbinService = new CasbinService(db);
    await casbinService.initialize();

    // Create user repository
    const userRepo = new UserRepository(db, auth);

    return new Repository(userRepo, casbinService);
  }
}
