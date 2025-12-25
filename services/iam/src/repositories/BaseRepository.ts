import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";

/**
 * Base repository class that provides access to database with transaction support.
 * All repositories should extend this class.
 */
export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>
  ) {}

  /**
   * Get active connection (transaction if in tx, otherwise db)
   * ALL queries should use this getter instead of this.db
   */
  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }
}
