import { and, eq, sql } from "drizzle-orm";
import { LoyaltyDomainError } from "../../application/errors.js";
import { BaseRepository } from "../BaseRepository.js";
import { configMutation, type ConfigMutation } from "../models/index.js";

export class ConfigMutationRepository extends BaseRepository {
  async lock(operation: string, idempotencyKey: string): Promise<void> {
    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`${this.storeId}:${operation}:${idempotencyKey}`}, 0)
      )
    `);
  }

  async find(operation: string, idempotencyKey: string): Promise<ConfigMutation | null> {
    const rows = await this.connection
      .select()
      .from(configMutation)
      .where(
        and(
          eq(configMutation.storeId, this.storeId),
          eq(configMutation.operation, operation),
          eq(configMutation.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async record(input: {
    operation: string;
    idempotencyKey: string;
    requestHash: string;
    resultKind: string | null;
    resultId: string | null;
  }): Promise<void> {
    await this.connection.insert(configMutation).values({ ...input, storeId: this.storeId });
  }

  requireSameRequest(record: ConfigMutation, requestHash: string): void {
    if (record.requestHash !== requestHash) {
      throw new LoyaltyDomainError(
        "IDEMPOTENCY_CONFLICT",
        "Idempotency key was already used with another loyalty configuration request",
      );
    }
  }
}
