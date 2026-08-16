import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";

export interface RepositoryConfig {
  db: Database;
}

export class Repository {
  readonly txManager: TransactionManager<Database>;

  private constructor(readonly database: Database) {
    this.txManager = new TransactionManager(database);
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    return new Repository(config.db);
  }

  get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}

export type { Database };
