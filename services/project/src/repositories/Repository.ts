import { TransactionManager } from "@shopana/shared-kernel";
import {
  initDatabase,
  closeDatabaseConnection,
  type Database,
} from "../infrastructure/db/database.js";
import { ProjectRepository } from "./project/ProjectRepository.js";
import { LocaleRepository } from "./locale/LocaleRepository.js";
import { CurrencyRepository } from "./currency/CurrencyRepository.js";
import { ApiKeyRepository } from "./apiKey/ApiKeyRepository.js";

export interface RepositoryConfig {
  databaseUrl: string;
}

export class Repository {
  public readonly project: ProjectRepository;
  public readonly locale: LocaleRepository;
  public readonly currency: CurrencyRepository;
  public readonly apiKey: ApiKeyRepository;

  private readonly db: Database;

  /** Transaction Manager - used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  private constructor(db: Database, txManager: TransactionManager<Database>) {
    this.db = db;
    this.txManager = txManager;

    this.project = new ProjectRepository(this.db, this.txManager);
    this.locale = new LocaleRepository(this.db, this.txManager);
    this.currency = new CurrencyRepository(this.db, this.txManager);
    this.apiKey = new ApiKeyRepository(this.db, this.txManager);
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const db = initDatabase(config.databaseUrl);
    const txManager = new TransactionManager(db);
    return new Repository(db, txManager);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}
