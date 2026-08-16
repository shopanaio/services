import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  ledgerEntries,
  lotAllocations,
  pointLots,
  transactions,
  type LedgerEntry,
  type LotAllocation,
  type LoyaltyTransaction,
  type NewLedgerEntry,
  type NewLotAllocation,
  type NewLoyaltyTransaction,
  type NewPointLot,
  type PointLot,
} from "../models/index.js";

export class LedgerRepository extends BaseRepository {
  async findTransactionById(id: string): Promise<LoyaltyTransaction | null> {
    const rows = await this.connection
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.storeId, this.storeId), eq(transactions.id, id)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findTransactionByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<LoyaltyTransaction | null> {
    const rows = await this.connection
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, this.storeId),
          eq(transactions.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listTransactions(
    accountId: string,
    limit = 100,
  ): Promise<LoyaltyTransaction[]> {
    return this.connection
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, this.storeId),
          eq(transactions.accountId, accountId),
        ),
      )
      .orderBy(desc(transactions.occurredAt), desc(transactions.id))
      .limit(limit);
  }

  async listEntries(transactionId: string): Promise<LedgerEntry[]> {
    return this.connection
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.storeId, this.storeId),
          eq(ledgerEntries.transactionId, transactionId),
        ),
      )
      .orderBy(asc(ledgerEntries.sequence));
  }

  async listEntriesForTransactions(
    transactionIds: readonly string[],
  ): Promise<LedgerEntry[]> {
    if (transactionIds.length === 0) return [];
    return this.connection
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.storeId, this.storeId),
          inArray(ledgerEntries.transactionId, [...transactionIds]),
        ),
      )
      .orderBy(asc(ledgerEntries.transactionId), asc(ledgerEntries.sequence));
  }

  async createTransaction(
    input: Omit<NewLoyaltyTransaction, "storeId">,
  ): Promise<LoyaltyTransaction> {
    const rows = await this.connection
      .insert(transactions)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async appendEntries(
    inputs: readonly Omit<NewLedgerEntry, "storeId">[],
  ): Promise<LedgerEntry[]> {
    if (inputs.length === 0) return [];
    return this.connection
      .insert(ledgerEntries)
      .values(inputs.map((input) => ({ ...input, storeId: this.storeId })))
      .returning();
  }

  async appendTransaction(
    transaction: Omit<NewLoyaltyTransaction, "storeId">,
    entries: readonly Omit<NewLedgerEntry, "storeId" | "transactionId" | "accountId">[],
  ): Promise<{ transaction: LoyaltyTransaction; entries: LedgerEntry[] }> {
    return this.txManager.run(async () => {
      const createdTransaction = await this.createTransaction(transaction);
      const createdEntries = await this.appendEntries(
        entries.map((entry) => ({
          ...entry,
          transactionId: createdTransaction.id,
          accountId: createdTransaction.accountId,
        })),
      );
      return { transaction: createdTransaction, entries: createdEntries };
    });
  }

  async createPointLots(
    inputs: readonly Omit<NewPointLot, "storeId">[],
  ): Promise<PointLot[]> {
    if (inputs.length === 0) return [];
    return this.connection
      .insert(pointLots)
      .values(inputs.map((input) => ({ ...input, storeId: this.storeId })))
      .returning();
  }

  async listPointLots(accountId: string): Promise<PointLot[]> {
    return this.connection
      .select()
      .from(pointLots)
      .where(
        and(
          eq(pointLots.storeId, this.storeId),
          eq(pointLots.accountId, accountId),
        ),
      )
      .orderBy(asc(pointLots.expiresAt), asc(pointLots.activatedAt), asc(pointLots.id));
  }

  async createLotAllocations(
    inputs: readonly Omit<NewLotAllocation, "storeId">[],
  ): Promise<LotAllocation[]> {
    if (inputs.length === 0) return [];
    return this.connection
      .insert(lotAllocations)
      .values(inputs.map((input) => ({ ...input, storeId: this.storeId })))
      .returning();
  }

  async listLotAllocations(lotIds: readonly string[]): Promise<LotAllocation[]> {
    if (lotIds.length === 0) return [];
    return this.connection
      .select()
      .from(lotAllocations)
      .where(
        and(
          eq(lotAllocations.storeId, this.storeId),
          inArray(lotAllocations.lotId, [...lotIds]),
        ),
      )
      .orderBy(asc(lotAllocations.createdAt), asc(lotAllocations.id));
  }
}
