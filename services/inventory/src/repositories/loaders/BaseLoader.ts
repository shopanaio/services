import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { getContext } from "../../context/index.js";

/**
 * Base loader class that provides access to database and context.
 * Loaders are similar to repositories but focused on batch loading
 * data using DataLoader pattern for N+1 query optimization.
 */
export abstract class BaseLoader {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>
  ) {}

  /**
   * Get active connection (transaction if in tx, otherwise db)
   */
  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  /**
   * Get projectId from async local storage context
   */
  protected get projectId(): string {
    return getContext().project.id;
  }

  /**
   * Get locale from context
   */
  protected get locale(): string {
    return getContext().locale ?? "uk";
  }
}
