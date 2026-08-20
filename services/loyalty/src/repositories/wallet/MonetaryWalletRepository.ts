import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  monetaryCreditLots,
  monetaryLedgerEntries,
  monetaryLotAllocations,
  monetaryTransactions,
  monetaryWalletBalances,
  monetaryWallets,
  type MonetaryCreditLot,
  type MonetaryLedgerEntry,
  type MonetaryLotAllocation,
  type MonetaryTransaction,
  type MonetaryWallet,
  type MonetaryWalletBalance,
  type NewMonetaryCreditLot,
  type NewMonetaryLedgerEntry,
  type NewMonetaryLotAllocation,
  type NewMonetaryTransaction,
  type NewMonetaryWallet,
  type NewMonetaryWalletBalance,
} from "../models/index.js";

export class MonetaryWalletRepository extends BaseRepository {
  async getWalletsByIds(ids: readonly string[]): Promise<MonetaryWallet[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryWallets)
      .where(and(eq(monetaryWallets.storeId, this.storeId), inArray(monetaryWallets.id, [...ids])));
  }

  async listWalletsFiltered(input: {
    accountIds?: readonly string[];
    walletTypes?: readonly MonetaryWallet["walletType"][];
    currencyCodes?: readonly string[];
    statuses?: readonly MonetaryWallet["status"][];
    limit: number;
  }): Promise<MonetaryWallet[]> {
    return this.connection
      .select()
      .from(monetaryWallets)
      .where(
        and(
          eq(monetaryWallets.storeId, this.storeId),
          input.accountIds?.length
            ? inArray(monetaryWallets.accountId, [...input.accountIds])
            : undefined,
          input.walletTypes?.length
            ? inArray(monetaryWallets.walletType, [...input.walletTypes])
            : undefined,
          input.currencyCodes?.length
            ? inArray(monetaryWallets.currencyCode, [...input.currencyCodes])
            : undefined,
          input.statuses?.length ? inArray(monetaryWallets.status, [...input.statuses]) : undefined,
        ),
      )
      .orderBy(desc(monetaryWallets.updatedAt), desc(monetaryWallets.id))
      .limit(input.limit);
  }

  async getTransactionsByIds(ids: readonly string[]): Promise<MonetaryTransaction[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryTransactions)
      .where(
        and(
          eq(monetaryTransactions.storeId, this.storeId),
          inArray(monetaryTransactions.id, [...ids]),
        ),
      );
  }

  async getEntriesByIds(ids: readonly string[]): Promise<MonetaryLedgerEntry[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryLedgerEntries)
      .where(
        and(
          eq(monetaryLedgerEntries.storeId, this.storeId),
          inArray(monetaryLedgerEntries.id, [...ids]),
        ),
      );
  }

  async getEntriesByTransactionIds(ids: readonly string[]): Promise<MonetaryLedgerEntry[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryLedgerEntries)
      .where(
        and(
          eq(monetaryLedgerEntries.storeId, this.storeId),
          inArray(monetaryLedgerEntries.transactionId, [...ids]),
        ),
      )
      .orderBy(asc(monetaryLedgerEntries.transactionId), asc(monetaryLedgerEntries.sequence));
  }

  async getCreditLotsByIds(ids: readonly string[]): Promise<MonetaryCreditLot[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(eq(monetaryCreditLots.storeId, this.storeId), inArray(monetaryCreditLots.id, [...ids])),
      );
  }

  async getCreditLotsByWalletIds(ids: readonly string[]): Promise<MonetaryCreditLot[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(
          eq(monetaryCreditLots.storeId, this.storeId),
          inArray(monetaryCreditLots.walletId, [...ids]),
        ),
      )
      .orderBy(
        asc(monetaryCreditLots.walletId),
        asc(monetaryCreditLots.expiresAt),
        asc(monetaryCreditLots.id),
      );
  }

  async getLotAllocationsByIds(ids: readonly string[]): Promise<MonetaryLotAllocation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryLotAllocations)
      .where(
        and(
          eq(monetaryLotAllocations.storeId, this.storeId),
          inArray(monetaryLotAllocations.id, [...ids]),
        ),
      );
  }

  async getLotAllocationsByLotIds(ids: readonly string[]): Promise<MonetaryLotAllocation[]> {
    return this.listLotAllocations(ids);
  }

  async getBalancesByWalletIds(ids: readonly string[]): Promise<MonetaryWalletBalance[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryWalletBalances)
      .where(
        and(
          eq(monetaryWalletBalances.storeId, this.storeId),
          inArray(monetaryWalletBalances.walletId, [...ids]),
        ),
      );
  }
  async findById(id: string): Promise<MonetaryWallet | null> {
    const rows = await this.connection
      .select()
      .from(monetaryWallets)
      .where(and(eq(monetaryWallets.storeId, this.storeId), eq(monetaryWallets.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async lockById(id: string): Promise<MonetaryWallet | null> {
    const rows = await this.connection
      .select()
      .from(monetaryWallets)
      .where(and(eq(monetaryWallets.storeId, this.storeId), eq(monetaryWallets.id, id)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async listForAccount(accountId: string): Promise<MonetaryWallet[]> {
    return this.connection
      .select()
      .from(monetaryWallets)
      .where(
        and(eq(monetaryWallets.storeId, this.storeId), eq(monetaryWallets.accountId, accountId)),
      )
      .orderBy(asc(monetaryWallets.currencyCode), asc(monetaryWallets.id));
  }

  async findForAccount(
    accountId: string,
    walletType: "CASHBACK" | "STORE_CREDIT",
    currencyCode: string,
  ): Promise<MonetaryWallet | null> {
    const rows = await this.connection
      .select()
      .from(monetaryWallets)
      .where(
        and(
          eq(monetaryWallets.storeId, this.storeId),
          eq(monetaryWallets.accountId, accountId),
          eq(monetaryWallets.walletType, walletType),
          eq(monetaryWallets.currencyCode, currencyCode),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createWallet(input: Omit<NewMonetaryWallet, "storeId">): Promise<MonetaryWallet> {
    const rows = await this.connection
      .insert(monetaryWallets)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async createWalletIfMissing(input: Omit<NewMonetaryWallet, "storeId">): Promise<MonetaryWallet> {
    const rows = await this.connection
      .insert(monetaryWallets)
      .values({ ...input, storeId: this.storeId })
      .onConflictDoNothing()
      .returning();
    if (rows[0]) return rows[0];
    const existing = await this.findForAccount(
      input.accountId,
      input.walletType ?? "CASHBACK",
      input.currencyCode,
    );
    if (!existing) throw new Error("Monetary wallet could not be created or resolved");
    return existing;
  }

  async updateWalletState(
    id: string,
    expectedRevision: number,
    input: Partial<Pick<NewMonetaryWallet, "status" | "mergedIntoWalletId" | "closedAt">>,
  ): Promise<MonetaryWallet | null> {
    const rows = await this.connection
      .update(monetaryWallets)
      .set({
        ...input,
        revision: sql`${monetaryWallets.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(monetaryWallets.storeId, this.storeId),
          eq(monetaryWallets.id, id),
          eq(monetaryWallets.revision, expectedRevision),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async findTransactionById(id: string): Promise<MonetaryTransaction | null> {
    const rows = await this.connection
      .select()
      .from(monetaryTransactions)
      .where(and(eq(monetaryTransactions.storeId, this.storeId), eq(monetaryTransactions.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findTransactionByIdempotencyKey(
    walletId: string,
    idempotencyKey: string,
  ): Promise<MonetaryTransaction | null> {
    const rows = await this.connection
      .select()
      .from(monetaryTransactions)
      .where(
        and(
          eq(monetaryTransactions.storeId, this.storeId),
          eq(monetaryTransactions.walletId, walletId),
          eq(monetaryTransactions.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listTransactions(walletId: string, limit = 100): Promise<MonetaryTransaction[]> {
    return this.connection
      .select()
      .from(monetaryTransactions)
      .where(
        and(
          eq(monetaryTransactions.storeId, this.storeId),
          eq(monetaryTransactions.walletId, walletId),
        ),
      )
      .orderBy(desc(monetaryTransactions.occurredAt), desc(monetaryTransactions.id))
      .limit(limit);
  }

  async listAllTransactions(walletId: string): Promise<MonetaryTransaction[]> {
    return this.connection
      .select()
      .from(monetaryTransactions)
      .where(
        and(
          eq(monetaryTransactions.storeId, this.storeId),
          eq(monetaryTransactions.walletId, walletId),
        ),
      )
      .orderBy(asc(monetaryTransactions.createdAt), asc(monetaryTransactions.id));
  }

  async appendTransaction(
    transaction: Omit<NewMonetaryTransaction, "storeId" | "entriesFinalized">,
    entries: readonly Omit<NewMonetaryLedgerEntry, "storeId" | "transactionId" | "walletId">[],
  ): Promise<{
    transaction: MonetaryTransaction;
    entries: MonetaryLedgerEntry[];
  }> {
    if (entries.length === 0) {
      throw new Error("A monetary transaction requires at least one ledger entry");
    }
    return this.txManager.run(async () => {
      const transactionRows = await this.connection
        .insert(monetaryTransactions)
        .values({
          ...transaction,
          storeId: this.storeId,
          entriesFinalized: false,
        })
        .returning();
      const createdTransaction = transactionRows[0]!;

      const createdEntries = await this.connection
        .insert(monetaryLedgerEntries)
        .values(
          entries.map((entry) => ({
            ...entry,
            storeId: this.storeId,
            transactionId: createdTransaction.id,
            walletId: createdTransaction.walletId,
          })),
        )
        .returning();

      const finalizedRows = await this.connection
        .update(monetaryTransactions)
        .set({ entriesFinalized: true })
        .where(
          and(
            eq(monetaryTransactions.storeId, this.storeId),
            eq(monetaryTransactions.id, createdTransaction.id),
            eq(monetaryTransactions.entriesFinalized, false),
          ),
        )
        .returning();

      return { transaction: finalizedRows[0]!, entries: createdEntries };
    });
  }

  async listEntries(transactionId: string): Promise<MonetaryLedgerEntry[]> {
    return this.connection
      .select()
      .from(monetaryLedgerEntries)
      .where(
        and(
          eq(monetaryLedgerEntries.storeId, this.storeId),
          eq(monetaryLedgerEntries.transactionId, transactionId),
        ),
      )
      .orderBy(asc(monetaryLedgerEntries.sequence));
  }

  async listEntriesForWallet(walletId: string): Promise<MonetaryLedgerEntry[]> {
    return this.connection
      .select()
      .from(monetaryLedgerEntries)
      .where(
        and(
          eq(monetaryLedgerEntries.storeId, this.storeId),
          eq(monetaryLedgerEntries.walletId, walletId),
        ),
      )
      .orderBy(asc(monetaryLedgerEntries.createdAt), asc(monetaryLedgerEntries.id));
  }

  async findEntryById(id: string): Promise<MonetaryLedgerEntry | null> {
    const rows = await this.connection
      .select()
      .from(monetaryLedgerEntries)
      .where(and(eq(monetaryLedgerEntries.storeId, this.storeId), eq(monetaryLedgerEntries.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async createCreditLots(
    inputs: readonly Omit<NewMonetaryCreditLot, "storeId">[],
  ): Promise<MonetaryCreditLot[]> {
    if (inputs.length === 0) return [];
    return this.connection
      .insert(monetaryCreditLots)
      .values(inputs.map((input) => ({ ...input, storeId: this.storeId })))
      .returning();
  }

  async listCreditLots(walletId: string): Promise<MonetaryCreditLot[]> {
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(
          eq(monetaryCreditLots.storeId, this.storeId),
          eq(monetaryCreditLots.walletId, walletId),
        ),
      )
      .orderBy(
        asc(monetaryCreditLots.expiresAt),
        asc(monetaryCreditLots.activatedAt),
        asc(monetaryCreditLots.id),
      );
  }

  async lockUsableCreditLots(walletId: string, at: string): Promise<MonetaryCreditLot[]> {
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(
          eq(monetaryCreditLots.storeId, this.storeId),
          eq(monetaryCreditLots.walletId, walletId),
          lte(monetaryCreditLots.activatedAt, at),
          or(isNull(monetaryCreditLots.expiresAt), gt(monetaryCreditLots.expiresAt, at)),
        ),
      )
      .orderBy(
        asc(monetaryCreditLots.expiresAt),
        asc(monetaryCreditLots.activatedAt),
        asc(monetaryCreditLots.id),
      )
      .for("update");
  }

  async lockExpiredCreditLots(walletId: string, at: string): Promise<MonetaryCreditLot[]> {
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(
          eq(monetaryCreditLots.storeId, this.storeId),
          eq(monetaryCreditLots.walletId, walletId),
          lte(monetaryCreditLots.expiresAt, at),
        ),
      )
      .orderBy(asc(monetaryCreditLots.expiresAt), asc(monetaryCreditLots.id))
      .for("update");
  }

  async lockCreditLotsByIds(
    walletId: string,
    ids: readonly string[],
  ): Promise<MonetaryCreditLot[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(
          eq(monetaryCreditLots.storeId, this.storeId),
          eq(monetaryCreditLots.walletId, walletId),
          inArray(monetaryCreditLots.id, [...ids]),
        ),
      )
      .orderBy(
        asc(monetaryCreditLots.expiresAt),
        asc(monetaryCreditLots.activatedAt),
        asc(monetaryCreditLots.id),
      )
      .for("update");
  }

  async lockAllCreditLots(walletId: string): Promise<MonetaryCreditLot[]> {
    return this.connection
      .select()
      .from(monetaryCreditLots)
      .where(
        and(
          eq(monetaryCreditLots.storeId, this.storeId),
          eq(monetaryCreditLots.walletId, walletId),
        ),
      )
      .orderBy(
        asc(monetaryCreditLots.expiresAt),
        asc(monetaryCreditLots.activatedAt),
        asc(monetaryCreditLots.id),
      )
      .for("update");
  }

  async createLotAllocations(
    inputs: readonly Omit<NewMonetaryLotAllocation, "storeId">[],
  ): Promise<MonetaryLotAllocation[]> {
    if (inputs.length === 0) return [];
    return this.connection
      .insert(monetaryLotAllocations)
      .values(inputs.map((input) => ({ ...input, storeId: this.storeId })))
      .returning();
  }

  async listLotAllocations(lotIds: readonly string[]): Promise<MonetaryLotAllocation[]> {
    if (lotIds.length === 0) return [];
    return this.connection
      .select()
      .from(monetaryLotAllocations)
      .where(
        and(
          eq(monetaryLotAllocations.storeId, this.storeId),
          inArray(monetaryLotAllocations.lotId, [...lotIds]),
        ),
      )
      .orderBy(asc(monetaryLotAllocations.createdAt), asc(monetaryLotAllocations.id));
  }

  async findBalance(walletId: string): Promise<MonetaryWalletBalance | null> {
    const rows = await this.connection
      .select()
      .from(monetaryWalletBalances)
      .where(
        and(
          eq(monetaryWalletBalances.storeId, this.storeId),
          eq(monetaryWalletBalances.walletId, walletId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async lockBalance(walletId: string): Promise<MonetaryWalletBalance | null> {
    const rows = await this.connection
      .select()
      .from(monetaryWalletBalances)
      .where(
        and(
          eq(monetaryWalletBalances.storeId, this.storeId),
          eq(monetaryWalletBalances.walletId, walletId),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async createBalance(
    input: Omit<NewMonetaryWalletBalance, "storeId">,
  ): Promise<MonetaryWalletBalance> {
    const rows = await this.connection
      .insert(monetaryWalletBalances)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async createBalanceIfMissing(
    input: Omit<NewMonetaryWalletBalance, "storeId">,
  ): Promise<MonetaryWalletBalance> {
    const rows = await this.connection
      .insert(monetaryWalletBalances)
      .values({ ...input, storeId: this.storeId })
      .onConflictDoNothing()
      .returning();
    if (rows[0]) return rows[0];
    const existing = await this.findBalance(input.walletId);
    if (!existing) throw new Error("Monetary wallet balance could not be created or resolved");
    return existing;
  }

  async updateBalance(
    walletId: string,
    expectedRevision: number,
    input: Partial<
      Pick<
        NewMonetaryWalletBalance,
        | "pendingAmountMinor"
        | "availableAmountMinor"
        | "reservedAmountMinor"
        | "debtAmountMinor"
        | "lastTransactionId"
      >
    >,
  ): Promise<MonetaryWalletBalance | null> {
    const rows = await this.connection
      .update(monetaryWalletBalances)
      .set({
        ...input,
        revision: sql`${monetaryWalletBalances.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(monetaryWalletBalances.storeId, this.storeId),
          eq(monetaryWalletBalances.walletId, walletId),
          eq(monetaryWalletBalances.revision, expectedRevision),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async replaceBalance(
    walletId: string,
    input: Pick<
      NewMonetaryWalletBalance,
      | "pendingAmountMinor"
      | "availableAmountMinor"
      | "reservedAmountMinor"
      | "debtAmountMinor"
      | "lastTransactionId"
    >,
  ): Promise<MonetaryWalletBalance | null> {
    const rows = await this.connection
      .update(monetaryWalletBalances)
      .set({
        ...input,
        revision: sql`${monetaryWalletBalances.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(monetaryWalletBalances.storeId, this.storeId),
          eq(monetaryWalletBalances.walletId, walletId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }
}
