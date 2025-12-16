import { TransactionManager } from "@shopana/shared-kernel";
import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database.js";
import { ProjectRepository } from "./project/ProjectRepository.js";
import { LocaleRepository } from "./locale/LocaleRepository.js";
import { CurrencyRepository } from "./currency/CurrencyRepository.js";
import { ApiKeyRepository } from "./apiKey/ApiKeyRepository.js";

export class Repository {
  public readonly project: ProjectRepository;
  public readonly locale: LocaleRepository;
  public readonly currency: CurrencyRepository;
  public readonly apiKey: ApiKeyRepository;

  private readonly db: Database;

  /** Transaction Manager — used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  constructor(connectionString: string) {
    this.db = initDatabase(connectionString);
    this.txManager = new TransactionManager(this.db);

    this.project = new ProjectRepository(this.db, this.txManager);
    this.locale = new LocaleRepository(this.db, this.txManager);
    this.currency = new CurrencyRepository(this.db, this.txManager);
    this.apiKey = new ApiKeyRepository(this.db, this.txManager);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}
