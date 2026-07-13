import type { TransactionManager } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
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

  protected async generateUuidV7s(count: number): Promise<string[]> {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("UUID count must be a non-negative safe integer");
    }
    if (count === 0) {
      return [];
    }

    const rows = await this.connection.execute<{ id: string }>(sql`
      SELECT uuidv7() AS id
      FROM generate_series(1, ${count}) AS series(ordinal)
      ORDER BY ordinal
    `);

    if (rows.length !== count) {
      throw new Error(`PostgreSQL uuidv7() returned ${rows.length} ids, expected ${count}`);
    }

    return rows.map((row) => row.id);
  }
}
