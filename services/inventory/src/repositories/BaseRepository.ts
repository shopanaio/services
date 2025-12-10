import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { getContext, type ServiceContext } from "../context/index.js";

/**
 * Base repository class that provides access to database and context
 * All repositories should extend this class to get automatic projectId from context
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
   * Get projectId from async local storage context
   * Throws if context is not available
   */
  protected get projectId(): string {
    return this.ctx.project.id;
  }
}
