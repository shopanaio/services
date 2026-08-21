import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";

export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>,
  ) {}

  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }
}
