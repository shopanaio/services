import type { TransactionManager } from "@shopana/shared-kernel";
import { getContext, type ServiceContext } from "../context/index.js";
import type { Database } from "../infrastructure/db/database.js";

/**
 * Base repository class that provides access to database and context
 * All repositories should extend this class to get automatic storeId from context
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

  /**
   * Get current service context from async local storage
   */
  protected get ctx(): ServiceContext {
    return getContext();
  }

  /**
   * Get store name from async local storage context
   */
  protected get storeName(): string | undefined {
    return this.ctx.storeName;
  }
}
