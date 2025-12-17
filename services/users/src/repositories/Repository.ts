import { UserRepository } from "./user/UserRepository.js";

export interface RepositoryConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  certificate?: string;
  organizationName: string;
  applicationName: string;
}

/**
 * Repository aggregator for users service
 */
export class Repository {
  public readonly user: UserRepository;

  constructor(_config: RepositoryConfig) {
    this.user = new UserRepository();
  }
}
