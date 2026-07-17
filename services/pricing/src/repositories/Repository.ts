import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { DiscountRepository } from "./DiscountRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

/** Aggregate for pricing repositories. Add domain repositories as readonly fields. */
export class Repository {
  public readonly discount: DiscountRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    discount: DiscountRepository,
    txManager: TransactionManager<Database>,
  ) {
    this.discount = discount;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    const discount = new DiscountRepository(config.db, txManager);
    return new Repository(discount, txManager);
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
