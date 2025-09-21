import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql, sql, singleOrNull } from "@event-driven-io/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import { dumboPool } from "@src/infrastructure/db/dumbo";

export type IdempotencyRecord = {
  projectId: string;
  idempotencyKey: string;
  requestHash: string;
  response: unknown;
  createdAt: Date;
  expiresAt: Date;
};

export class IdempotencyRepository {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async get(
    projectId: string,
    idempotencyKey: string
  ): Promise<{ id: string } | null> {
    const q = knex
      .withSchema("platform")
      .table("idempotency")
      .select("response")
      .where({
        project_id: projectId,
        idempotency_key: idempotencyKey,
      })
      .andWhereRaw("expires_at > NOW()")
      .toString();
    const row = await singleOrNull(
      this.execute.query<{ response: unknown }>(rawSql(q))
    );

    return row ? (row.response as { id: string }) : null;
  }

  async save(input: {
    projectId: string;
    idempotencyKey: string;
    requestHash: string;
    response: { id: string };
    ttlSeconds?: number;
  }): Promise<void> {
    const ttl = input.ttlSeconds ?? 24 * 60 * 60;
    const q = knex
      .withSchema("platform")
      .table("idempotency")
      .insert({
        project_id: input.projectId,
        idempotency_key: input.idempotencyKey,
        request_hash: input.requestHash,
        response: knex.raw(`?::jsonb`, [JSON.stringify(input.response)]),
        expires_at: knex.raw(`NOW() + (? || ' seconds')::interval`, [ttl]),
      })
      .onConflict(["project_id", "idempotency_key"])
      .ignore()
      .toString();
    await this.execute.command(rawSql(q));
  }

  async cleanupExpired(): Promise<number> {
    const q = knex
      .withSchema("platform")
      .table("idempotency")
      .delete()
      .whereRaw("expires_at <= NOW()")
      .toString();
    const res = await this.execute.command(rawSql(q));
    return res.rowCount ?? 0;
  }
}
