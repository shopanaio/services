import type { TransactionManager } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
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

  /** Generate persisted identifiers with the service-owned PostgreSQL UUIDv7 function. */
  protected async generateUuidV7(): Promise<string> {
    const rows = await this.connection.execute<{ id: string }>(
      sql`SELECT uuidv7() AS id`
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new Error("PostgreSQL uuidv7() did not return an id");
    }
    return id;
  }
}
