import type { TransactionManager } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { getContext, type ServiceContext } from "../context/index.js";
import type { Database } from "../infrastructure/db/database.js";

/** Common tenant-aware infrastructure for Loyalty repositories. */
export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>,
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

  protected async generateUuidV7(): Promise<string> {
    const rows = await this.connection.execute<{ id: string }>(
      sql`SELECT uuidv7() AS id`,
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new Error("PostgreSQL uuidv7() did not return an id");
    }
    return id;
  }
}
