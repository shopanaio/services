import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

/** Aggregate for pricing repositories. Add domain repositories as readonly fields. */
export class Repository {
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(txManager: TransactionManager<Database>) {
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    return new Repository(new TransactionManager(config.db));
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
