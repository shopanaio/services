import { sql } from "drizzle-orm";
import { orderNumberCounters } from "@src/repositories/models/index";
import { BaseRepository } from "@src/repositories/BaseRepository";

export class OrderNumberRepository extends BaseRepository {
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
