import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  accountBalances,
  accountExpiringPoints,
  type AccountBalance,
  type AccountExpiringPoint,
  type NewAccountBalance,
} from "../models/index.js";

export class BalanceRepository extends BaseRepository {
  async findByAccountId(accountId: string): Promise<AccountBalance | null> {
    const rows = await this.connection
      .select()
      .from(accountBalances)
      .where(
        and(eq(accountBalances.storeId, this.storeId), eq(accountBalances.accountId, accountId)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async lockByAccountId(accountId: string): Promise<AccountBalance | null> {
    const rows = await this.connection
      .select()
      .from(accountBalances)
      .where(
        and(eq(accountBalances.storeId, this.storeId), eq(accountBalances.accountId, accountId)),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async getByAccountIds(accountIds: readonly string[]): Promise<AccountBalance[]> {
    if (accountIds.length === 0) return [];
    return this.connection
      .select()
      .from(accountBalances)
      .where(
        and(
          eq(accountBalances.storeId, this.storeId),
          inArray(accountBalances.accountId, [...accountIds]),
        ),
      );
  }

  async create(input: Omit<NewAccountBalance, "storeId">): Promise<AccountBalance> {
    const rows = await this.connection
      .insert(accountBalances)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async createIfMissing(input: Omit<NewAccountBalance, "storeId">): Promise<AccountBalance> {
    const rows = await this.connection
      .insert(accountBalances)
      .values({ ...input, storeId: this.storeId })
      .onConflictDoNothing()
      .returning();
    if (rows[0]) return rows[0];
    const existing = await this.findByAccountId(input.accountId);
    if (!existing) throw new Error("Loyalty account balance could not be created or resolved");
    return existing;
  }

  async update(
    accountId: string,

    input: Partial<
      Pick<
        NewAccountBalance,
        | "pendingPoints"
        | "availablePoints"
        | "reservedPoints"
        | "debtPoints"
        | "lifetimeEarnedPoints"
        | "lifetimeRedeemedPoints"
        | "lifetimeExpiredPoints"
        | "lifetimeAdjustedPoints"
        | "lastTransactionId"
      >
    >,
  ): Promise<AccountBalance | null> {
    const rows = await this.connection
      .update(accountBalances)
      .set({
        ...input,
        revision: sql`${accountBalances.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(accountBalances.storeId, this.storeId), eq(accountBalances.accountId, accountId)),
      )
      .returning();
    return rows[0] ?? null;
  }

  async replace(
    accountId: string,
    input: Pick<
      NewAccountBalance,
      | "pendingPoints"
      | "availablePoints"
      | "reservedPoints"
      | "debtPoints"
      | "lifetimeEarnedPoints"
      | "lifetimeRedeemedPoints"
      | "lifetimeExpiredPoints"
      | "lifetimeAdjustedPoints"
      | "lastTransactionId"
    >,
  ): Promise<AccountBalance | null> {
    const rows = await this.connection
      .update(accountBalances)
      .set({
        ...input,
        revision: sql`${accountBalances.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(accountBalances.storeId, this.storeId), eq(accountBalances.accountId, accountId)),
      )
      .returning();
    return rows[0] ?? null;
  }

  async listExpiringPoints(accountId: string): Promise<AccountExpiringPoint[]> {
    return this.connection
      .select()
      .from(accountExpiringPoints)
      .where(
        and(
          eq(accountExpiringPoints.storeId, this.storeId),
          eq(accountExpiringPoints.accountId, accountId),
        ),
      )
      .orderBy(asc(accountExpiringPoints.expiresAt), asc(accountExpiringPoints.lotId));
  }

  async listExpiringPointsForAccounts(
    accountIds: readonly string[],
  ): Promise<AccountExpiringPoint[]> {
    if (accountIds.length === 0) return [];
    return this.connection
      .select()
      .from(accountExpiringPoints)
      .where(
        and(
          eq(accountExpiringPoints.storeId, this.storeId),
          inArray(accountExpiringPoints.accountId, [...accountIds]),
        ),
      )
      .orderBy(
        asc(accountExpiringPoints.accountId),
        asc(accountExpiringPoints.expiresAt),
        asc(accountExpiringPoints.lotId),
      );
  }
}
