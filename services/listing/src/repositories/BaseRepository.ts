import type { TransactionManager } from "@shopana/shared-kernel";
import { getContext, type ServiceContext } from "../context/index.js";
import type { Database } from "../infrastructure/db/database.js";

export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>
  ) {}

  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  protected get ctx(): ServiceContext {
    return getContext();
  }

  protected get storeId(): string {
    return this.ctx.store.id;
  }
}
