import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
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

  async listAllTransactions(accountId: string): Promise<LoyaltyTransaction[]> {
    return this.connection
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, this.storeId),
          eq(transactions.accountId, accountId),
        ),
      )
      .orderBy(asc(transactions.createdAt), asc(transactions.id));
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

  async findEntryById(id: string): Promise<LedgerEntry | null> {
    const rows = await this.connection
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.storeId, this.storeId),
          eq(ledgerEntries.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
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

  async listEntriesForAccount(accountId: string): Promise<LedgerEntry[]> {
    return this.connection
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.storeId, this.storeId),
          eq(ledgerEntries.accountId, accountId),
        ),
      )
      .orderBy(asc(ledgerEntries.createdAt), asc(ledgerEntries.id));
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

  async lockUsablePointLots(accountId: string, at: string): Promise<PointLot[]> {
    return this.connection
      .select()
      .from(pointLots)
      .where(
        and(
          eq(pointLots.storeId, this.storeId),
          eq(pointLots.accountId, accountId),
          lte(pointLots.activatedAt, at),
          or(isNull(pointLots.expiresAt), gt(pointLots.expiresAt, at)),
        ),
      )
      .orderBy(asc(pointLots.expiresAt), asc(pointLots.activatedAt), asc(pointLots.id))
      .for("update");
  }

  async lockPendingPointLots(accountId: string, at: string): Promise<PointLot[]> {
    return this.connection
      .select()
      .from(pointLots)
      .where(
        and(
          eq(pointLots.storeId, this.storeId),
          eq(pointLots.accountId, accountId),
          gt(pointLots.activatedAt, at),
        ),
      )
      .orderBy(asc(pointLots.activatedAt), asc(pointLots.id))
      .for("update");
  }

  async lockExpiredPointLots(accountId: string, at: string): Promise<PointLot[]> {
    return this.connection
      .select()
      .from(pointLots)
      .where(
        and(
          eq(pointLots.storeId, this.storeId),
          eq(pointLots.accountId, accountId),
          lte(pointLots.expiresAt, at),
        ),
      )
      .orderBy(asc(pointLots.expiresAt), asc(pointLots.id))
      .for("update");
  }

  async lockAllPointLots(accountId: string): Promise<PointLot[]> {
    return this.connection
      .select()
      .from(pointLots)
      .where(and(
        eq(pointLots.storeId, this.storeId),
        eq(pointLots.accountId, accountId),
      ))
      .orderBy(asc(pointLots.expiresAt), asc(pointLots.activatedAt), asc(pointLots.id))
      .for("update");
  }

  async lockPointLotsByIds(
    accountId: string,
    ids: readonly string[],
  ): Promise<PointLot[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(pointLots)
      .where(and(
        eq(pointLots.storeId, this.storeId),
        eq(pointLots.accountId, accountId),
        inArray(pointLots.id, [...ids]),
      ))
      .orderBy(asc(pointLots.expiresAt), asc(pointLots.activatedAt), asc(pointLots.id))
      .for("update");
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
