import { Client, type AuthConfig } from "@shopana/casdoor-node-sdk";
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
  public readonly client: Client;
  public readonly organization: string;
  public readonly application: string;

  constructor(config: RepositoryConfig) {
    const authConfig: AuthConfig = {
      endpoint: config.endpoint,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      certificate: config.certificate ?? "",
      organizationName: config.organizationName,
      applicationName: config.applicationName,
    };
    this.client = new Client(authConfig);
    this.organization = config.organizationName;
    this.application = config.applicationName;
    this.user = new UserRepository(this.client, this.organization, this.application);
  }
}
