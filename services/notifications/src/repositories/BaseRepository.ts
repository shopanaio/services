import { sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { Database } from "../infrastructure/db/database.js";
import type { DataProtectionService } from "../infrastructure/secrets/DataProtectionService.js";

export abstract class BaseRepository {
  constructor(
    protected readonly db: Database,
    protected readonly txManager: TransactionManager<Database>,
    protected readonly protection: DataProtectionService
  ) {}

  protected get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  protected get storeId(): string {
    return getContext().store.id;
  }

  protected async generateUuidV7(): Promise<string> {
    const rows = await this.connection.execute<{ id: string }>(
      sql`SELECT uuidv7() AS id`
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("PostgreSQL uuidv7() did not return an id");
    return id;
  }
}
