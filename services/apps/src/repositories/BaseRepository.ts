import type { TransactionManager } from "@shopana/shared-kernel";
import { getContext, type ServiceContext } from "../context/index.js";
import type { Database } from "../infrastructure/db/database.js";

export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>,
  ) {}

  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  /**
   * Request-scoped service context.
   *
   * Internal lifecycle repositories may continue to use explicit store IDs,
   * while GraphQL-facing methods must use this context-derived store.
   */
  protected get ctx(): ServiceContext {
    return getContext();
  }

  /**
   * Trusted current store ID populated by the admin context middleware.
   */
  protected get storeId(): string {
    return this.ctx.store.id;
  }
}
