import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { StoreRepository } from "./store/StoreRepository.js";
import { LocaleRepository } from "./locale/LocaleRepository.js";
import { IntegrationRepository } from "./integration/IntegrationRepository.js";
import { StoreSettingsRepository } from "./storeSettings/StoreSettingsRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export class Repository {
  public readonly store: StoreRepository;
  public readonly locale: LocaleRepository;
  public readonly integration: IntegrationRepository;
  public readonly storeSettings: StoreSettingsRepository;

  private readonly db: Database;

  /** Transaction Manager - used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  private constructor(db: Database, txManager: TransactionManager<Database>) {
    this.db = db;
    this.txManager = txManager;

    this.store = new StoreRepository(this.db, this.txManager);
    this.locale = new LocaleRepository(this.db, this.txManager);
    this.integration = new IntegrationRepository(this.db, this.txManager);
    this.storeSettings = new StoreSettingsRepository(this.db, this.txManager);
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    return new Repository(config.db, txManager);
  }

  async close(): Promise<void> {
    // Connection pool is managed by DatabaseModule
  }
}
