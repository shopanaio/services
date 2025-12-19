import { TransactionManager } from "@shopana/shared-kernel";
import { type CasdoorConfig } from "@shopana/shared-service-config";
import {
  CasdoorNodeClient,
  type CasdoorNodeClientConfig,
} from "@zaytra/casdoor-node-client-ext";
import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database.js";
import { ProjectRepository } from "./project/ProjectRepository.js";
import { LocaleRepository } from "./locale/LocaleRepository.js";
import { CurrencyRepository } from "./currency/CurrencyRepository.js";
import { ApiKeyRepository } from "./apiKey/ApiKeyRepository.js";

export interface RepositoryConfig {
  databaseUrl: string;
  casdoor?: CasdoorConfig;
}

export class Repository {
  public readonly project: ProjectRepository;
  public readonly locale: LocaleRepository;
  public readonly currency: CurrencyRepository;
  public readonly apiKey: ApiKeyRepository;

  private readonly db: Database;

  /** Casdoor client for IAM operations */
  public readonly casdoor: CasdoorNodeClient | null;

  /** Transaction Manager — used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  private constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    casdoorClient: CasdoorNodeClient | null
  ) {
    this.db = db;
    this.txManager = txManager;
    this.casdoor = casdoorClient;

    this.project = new ProjectRepository(this.db, this.txManager);
    this.locale = new LocaleRepository(this.db, this.txManager);
    this.currency = new CurrencyRepository(this.db, this.txManager);
    this.apiKey = new ApiKeyRepository(this.db, this.txManager);
  }

  /**
   * Create Repository with auto-fetched certificate from Casdoor
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const db = initDatabase(config.databaseUrl);
    const txManager = new TransactionManager(db);

    let casdoorClient: CasdoorNodeClient | null = null;

    if (config.casdoor) {
      const casdoorConfig = config.casdoor;

      // First create a temporary client to fetch the certificate
      const tempClient = new CasdoorNodeClient({
        casdoorBaseUrl: casdoorConfig.endpoint,
        sdkConfig: {
          endpoint: casdoorConfig.endpoint,
          clientId: casdoorConfig.client_id,
          clientSecret: casdoorConfig.client_secret,
          certificate: "",
          orgName: casdoorConfig.organization_name,
          appName: casdoorConfig.application_name,
        },
        cookie: { mode: "forward" },
      });

      // Fetch certificate by name from config
      let certificate = "";
      if (casdoorConfig.certificate) {
        console.log("[PROJECT] Fetching certificate:", casdoorConfig.certificate);
        const certResponse = await tempClient.sdk.getCert(casdoorConfig.certificate);
        certificate = certResponse.data?.data?.certificate ?? "";
        console.log("[PROJECT] Certificate fetched, length:", certificate.length);
      } else {
        console.warn("[PROJECT] No certificate name in config");
      }

      // Create the actual client with the certificate
      const clientConfig: CasdoorNodeClientConfig = {
        casdoorBaseUrl: casdoorConfig.endpoint,
        sdkConfig: {
          endpoint: casdoorConfig.endpoint,
          clientId: casdoorConfig.client_id,
          clientSecret: casdoorConfig.client_secret,
          certificate,
          orgName: casdoorConfig.organization_name,
          appName: casdoorConfig.application_name,
        },
        cookie: { mode: "forward" },
      };

      casdoorClient = new CasdoorNodeClient(clientConfig);
      console.log("[PROJECT] Casdoor client initialized");
    }

    return new Repository(db, txManager, casdoorClient);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}
