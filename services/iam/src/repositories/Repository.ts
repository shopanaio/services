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

  private constructor(
    client: CasdoorNodeClient,
    organization: string,
    application: string
  ) {
    this.client = client;
    this.organization = organization;
    this.application = application;
    this.user = new UserRepository(client, organization, application);
  }

  /**
   * Create Repository with auto-fetched certificate from Casdoor
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    // First create a temporary client to fetch the certificate
    const tempClient = new CasdoorNodeClient({
      casdoorBaseUrl: config.endpoint,
      sdkConfig: {
        endpoint: config.endpoint,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        certificate: "",
        orgName: config.organizationName,
        appName: config.applicationName,
      },
      cookie: { mode: "forward" },
    });

    // Fetch certificate by name from config
    let certificate = "";

    if (config.certificate) {
      console.log("[IAM] Fetching certificate:", config.certificate);
      const certResponse = await tempClient.sdk.getCert(config.certificate);
      certificate = certResponse.data?.data?.certificate ?? "";
      console.log("[IAM] Certificate fetched, length:", certificate.length);
    } else {
      console.warn("[IAM] No certificate name in config");
    }

    // Create the actual client with the certificate
    const clientConfig: CasdoorNodeClientConfig = {
      casdoorBaseUrl: config.endpoint,
      sdkConfig: {
        endpoint: config.endpoint,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        certificate,
        orgName: config.organizationName,
        appName: config.applicationName,
      },
      cookie: { mode: "forward" },
    };

    const client = new CasdoorNodeClient(clientConfig);
    return new Repository(client, config.organizationName, config.applicationName);
  }
}
