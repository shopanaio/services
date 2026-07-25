import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { AppInstallationRepository } from "./installation/AppInstallationRepository.js";
import { AppInstallationSecretRepository } from "./secret/AppInstallationSecretRepository.js";

export interface RepositoryConfig {
  readonly db: Database;
}

export type { Database };

export class Repository {
  public readonly installation: AppInstallationRepository;
  public readonly secret: AppInstallationSecretRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    installation: AppInstallationRepository,
    secret: AppInstallationSecretRepository,
    txManager: TransactionManager<Database>,
  ) {
    this.installation = installation;
    this.secret = secret;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    const installation = new AppInstallationRepository(
      config.db,
      txManager,
    );
    const secret = new AppInstallationSecretRepository(
      config.db,
      txManager,
    );

    return new Repository(installation, secret, txManager);
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
