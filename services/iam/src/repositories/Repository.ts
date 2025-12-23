import { UserRepository, type User } from "./user/UserRepository.js";
import {
  AuthorizationRepository,
  RoleRepository,
  UserRoleRepository,
  TenantRepository,
} from "./authorization/index.js";
import { OrganizationRepository } from "./organization/index.js";
import { ResourceRepository } from "./resource/index.js";
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
  public readonly authorization: AuthorizationRepository;
  public readonly organization: OrganizationRepository;
  public readonly resource: ResourceRepository;
  public readonly casbin: CasbinService;

  private constructor(
    user: UserRepository,
    authorization: AuthorizationRepository,
    organization: OrganizationRepository,
    resource: ResourceRepository,
    casbin: CasbinService
  ) {
    this.user = user;
    this.authorization = authorization;
    this.organization = organization;
    this.resource = resource;
    this.casbin = casbin;
  }

  /**
   * Create Repository with database and auth instances
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db, auth, databaseUrl } = config;

    // Initialize Casbin service with Drizzle DB instance
    const casbinService = new CasbinService(db);
    await casbinService.initialize();

    // Create database repositories
    const roleRepo = new RoleRepository(db);
    const userRoleRepo = new UserRoleRepository(db);
    const tenantRepo = new TenantRepository(db);
    const organizationRepo = new OrganizationRepository(db);
    const resourceRepo = new ResourceRepository(db);

    // Create authorization repository (facade)
    const authorizationRepo = new AuthorizationRepository(
      casbinService,
      roleRepo,
      userRoleRepo,
      tenantRepo
    );

    // Create user repository
    const userRepo = new UserRepository(db, auth);

    return new Repository(
      userRepo,
      authorizationRepo,
      organizationRepo,
      resourceRepo,
      casbinService
    );
  }
}
