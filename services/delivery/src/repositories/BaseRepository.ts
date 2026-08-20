import { sql } from "drizzle-orm";
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

  protected async generateUuidV7(): Promise<string> {
    const rows = await this.connection.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
    const id = rows[0]?.id;
    if (!id) throw new Error("PostgreSQL uuidv7() did not return an id");
    return id;
  }
}
