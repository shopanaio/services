import { and, eq, gt, lte, sql } from "drizzle-orm";
import { idempotency } from "@src/repositories/models/index";
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
      .select({ response: idempotency.response })
      .from(idempotency)
      .where(and(
        eq(idempotency.storeId, storeId),
        eq(idempotency.idempotencyKey, idempotencyKey),
        gt(idempotency.expiresAt, sql`now()`),
      ))
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
    await this.connection
      .insert(idempotency)
      .values({
        storeId: input.storeId,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        response: input.response,
        expiresAt: new Date(Date.now() + ttlSeconds * 1_000),
      });
  }

  async cleanupExpired(): Promise<number> {
    const rows = await this.connection
      .delete(idempotency)
      .where(lte(idempotency.expiresAt, sql`now()`))
      .returning({ id: idempotency.id });
    return rows.length;
  }
}
