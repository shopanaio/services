import { sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { OrderNumberPort } from "@src/application/ports/orderNumberPort";
import type { Database } from "@src/infrastructure/db/database";
import { orderNumberCounters } from "@src/repositories/models/index";

export class OrderNumberRepository implements OrderNumberPort {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>,
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async reserve(storeId: string): Promise<number> {
    const [row] = await this.connection
      .insert(orderNumberCounters)
      .values({ storeId, lastNumber: 1n })
      .onConflictDoUpdate({
        target: orderNumberCounters.storeId,
        set: {
          lastNumber: sql`${orderNumberCounters.lastNumber} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ lastNumber: orderNumberCounters.lastNumber });

    if (!row) {
      throw new Error(`Failed to reserve order number for store ${storeId}`);
    }

    const value = Number(row.lastNumber);
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Invalid order number value returned for store ${storeId}`);
    }
    return value;
  }
}
