import {
  CasdoorNodeClient,
  type CasdoorNodeClientConfig,
} from "@zaytra/casdoor-node-client-ext";
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
  public readonly client: CasdoorNodeClient;
  public readonly organization: string;
  public readonly application: string;

  constructor(config: RepositoryConfig) {
    const clientConfig: CasdoorNodeClientConfig = {
      casdoorBaseUrl: config.endpoint,
      sdkConfig: {
        endpoint: config.endpoint,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        certificate: config.certificate ?? "",
        orgName: config.organizationName,
        appName: config.applicationName,
      },
      cookie: { mode: "forward" },
    };
    this.client = new CasdoorNodeClient(clientConfig);
    this.organization = config.organizationName;
    this.application = config.applicationName;
    this.user = new UserRepository(this.client, this.organization, this.application);
  }
}
