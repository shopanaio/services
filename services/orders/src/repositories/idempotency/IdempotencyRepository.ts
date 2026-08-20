import { and, eq, gt, lte, sql } from "drizzle-orm";
import { idempotencyRecords } from "@src/repositories/models/index";
import { BaseRepository } from "@src/repositories/BaseRepository";

export type IdempotencyRecord = {
  storeId: string;
  idempotencyKey: string;
  requestHash: string;
  response: unknown;
  createdAt: Date;
  expiresAt: Date;
};

export class IdempotencyRepository extends BaseRepository {
  async get(storeId: string, idempotencyKey: string): Promise<{ id: string } | null> {
    const [row] = await this.connection
      .select({ response: idempotencyRecords.response })
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.storeId, storeId),
          eq(idempotencyRecords.operation, "order.create"),
          eq(idempotencyRecords.idempotencyKey, idempotencyKey),
          gt(idempotencyRecords.expiresAt, sql`now()`),
        ),
      )
      .limit(1);

    return row?.response ?? null;
  }

  async save(input: {
    storeId: string;
    idempotencyKey: string;
    requestHash: string;
    response: { id: string };
    ttlSeconds?: number;
  }): Promise<void> {
    const ttlSeconds = input.ttlSeconds ?? 24 * 60 * 60;
    await this.connection.insert(idempotencyRecords).values({
      storeId: input.storeId,
      operation: "order.create",
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      response: input.response,
      responseStatus: 200,
      status: "COMPLETED",
      expiresAt: new Date(Date.now() + ttlSeconds * 1_000).toISOString(),
    });
  }

  async cleanupExpired(): Promise<number> {
    const rows = await this.connection
      .delete(idempotencyRecords)
      .where(lte(idempotencyRecords.expiresAt, sql`now()`))
      .returning({ id: idempotencyRecords.id });
    return rows.length;
  }
}
