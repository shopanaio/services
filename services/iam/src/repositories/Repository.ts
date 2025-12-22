import { UserRepository, type User } from "./user/UserRepository.js";
import { AuthorizationRepository } from "./authorization/AuthorizationRepository.js";
import type { Database } from "../db/database.js";
import type { Auth } from "../auth/auth.js";

// Re-export User type
export type { User };

export interface RepositoryConfig {
  db: Database;
  auth: Auth;
}

/**
 * Repository aggregator for IAM service.
 * Manages access to user and authorization repositories.
 */
export class Repository {
  public readonly user: UserRepository;
  public readonly authorization: AuthorizationRepository;

  private constructor(config: RepositoryConfig) {
    this.user = new UserRepository(config.db, config.auth);
    this.authorization = new AuthorizationRepository();
  }

  /**
   * Create Repository with database and auth instances
   */
  static create(config: RepositoryConfig): Repository {
    return new Repository(config);
  }
}
