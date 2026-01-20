import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";

export interface RepositoryConfig {
  db: Database;
}

export class Repository {
  public readonly txManager: TransactionManager<Database>;

  constructor(private readonly db: Database, txManager: TransactionManager<Database>) {
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    return new Repository(config.db, txManager);
  }

  get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async close(): Promise<void> {
    // Connection pool managed by DatabaseModule.
  }
}
