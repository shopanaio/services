import type { Repository } from "../../repositories/Repository.js";
import type {
  Account,
  MonetaryCreditLot,
  MonetaryLedgerEntry,
  MonetaryTransaction,
  MonetaryWallet,
  MonetaryWalletBalance,
  NewMonetaryTransaction,
} from "../../repositories/models/index.js";
import type { LoyaltyMonetaryWalletType } from "../../contracts/types.js";
import { LoyaltyDomainError } from "../errors.js";
import { canonicalHash, divideRounded } from "../math.js";
import { PointsLedgerService } from "../ledger/PointsLedgerService.js";

type MonetaryBucket = "PENDING" | "AVAILABLE" | "RESERVED" | "DEBT";

export interface MonetaryEntryChange {
  bucket: MonetaryBucket;
  amountMinorDelta: bigint;
}

export interface MonetaryOperationInput {
  wallet: MonetaryWallet;
  programVersionId: string | null;
  kind: NewMonetaryTransaction["kind"];
  sourceType: string;
  sourceId?: string | null;
  sourceRevision?: string | null;
  idempotencyKey: string;
  requestHash: string;
  actorType: NewMonetaryTransaction["actorType"];
  actorId?: string | null;
  reasonCode: string;
  occurredAt: string;
  effectiveAt: string;
  metadata?: Record<string, unknown>;
  entries: readonly MonetaryEntryChange[];
}

export interface MonetaryOperationResult {
  transaction: MonetaryTransaction;
  entries: MonetaryLedgerEntry[];
  balance: MonetaryWalletBalance;
  created: boolean;
}

export class MonetaryWalletService {
  constructor(private readonly repository: Repository) {}

  async ensureWallet(
    account: Account,
    walletType: LoyaltyMonetaryWalletType,
    currencyCode: string,
  ): Promise<MonetaryWallet> {
    return this.repository.runInTransaction(async () => {
      const existing = await this.repository.wallet.findForAccount(account.id, walletType, currencyCode);
      if (existing) return existing;
      const wallet = await this.repository.wallet.createWalletIfMissing({
        programId: account.programId,
        accountId: account.id,
        walletType,
        currencyCode,
      });
      await this.repository.wallet.createBalanceIfMissing({ walletId: wallet.id });
      return wallet;
    });
  }

  async apply(input: MonetaryOperationInput): Promise<MonetaryOperationResult> {
    return this.repository.runInTransaction(() => this.applyInside(input));
  }

  async credit(input: Omit<MonetaryOperationInput, "entries"> & {
    amountMinor: bigint;
    activationAt: string;
    expiresAt: string | null;
  }): Promise<MonetaryOperationResult & { lot: MonetaryCreditLot | null }> {
    return this.repository.runInTransaction(async () => {
      if (input.amountMinor <= 0n) throw new LoyaltyDomainError("INVALID_MONETARY_AMOUNT", "Monetary credit must be positive");
      await this.lockWalletForOperation(input.wallet.id);
      const balance = await this.requireBalance(input.wallet.id, true);
      const recovered = balance.debtAmountMinor < input.amountMinor ? balance.debtAmountMinor : input.amountMinor;
      const credited = input.amountMinor - recovered;
      const bucket: MonetaryBucket = Date.parse(input.activationAt) > Date.parse(input.occurredAt)
        ? "PENDING"
        : "AVAILABLE";
      const operation = await this.applyInside({
        ...input,
        metadata: {
          ...input.metadata,
          amountMinor: input.amountMinor.toString(),
          recoveredDebtAmountMinor: recovered.toString(),
          creditedAmountMinor: credited.toString(),
        },
        entries: [
          ...(recovered > 0n ? [{ bucket: "DEBT" as const, amountMinorDelta: -recovered }] : []),
          ...(credited > 0n ? [{ bucket, amountMinorDelta: credited }] : []),
        ],
      });
      if (!operation.created || credited === 0n) return { ...operation, lot: null };
      const entry = operation.entries.find(({ bucket: entryBucket, amountMinorDelta }) =>
        entryBucket === bucket && amountMinorDelta > 0n,
      );
      if (!entry) throw new LoyaltyDomainError("MONETARY_LEDGER_INTEGRITY", "Monetary credit entry is missing", true);
      const [lot] = await this.repository.wallet.createCreditLots([{
        walletId: input.wallet.id,
        originEntryId: entry.id,
        amountIssuedMinor: credited,
        activatedAt: input.activationAt,
        expiresAt: input.expiresAt,
      }]);
      return { ...operation, lot: lot ?? null };
    });
  }

  async debitAvailableWithLots(
    input: Omit<MonetaryOperationInput, "entries"> & {
      amountMinor: bigint;
      creditReserved?: boolean;
      debitBucket?: "AVAILABLE" | "PENDING";
      lotIds?: readonly string[];
    },
  ): Promise<MonetaryOperationResult> {
    return this.repository.runInTransaction(async () => {
      const debitBucket = input.debitBucket ?? "AVAILABLE";
      const operation = await this.applyInside({
        ...input,
        entries: [
          { bucket: debitBucket, amountMinorDelta: -input.amountMinor },
          ...(input.creditReserved ? [{ bucket: "RESERVED" as const, amountMinorDelta: input.amountMinor }] : []),
        ],
      });
      if (!operation.created) return operation;
      const debit = operation.entries.find(({ bucket, amountMinorDelta }) => bucket === debitBucket && amountMinorDelta < 0n);
      if (!debit) throw new LoyaltyDomainError("MONETARY_LEDGER_INTEGRITY", "Monetary debit entry is missing", true);
      const allocations = await this.allocateLots(
        input.wallet.id,
        input.effectiveAt,
        input.amountMinor,
        debitBucket,
        input.kind === "EXPIRE",
        input.lotIds,
      );
      await this.repository.wallet.createLotAllocations(
        allocations.map(({ lot, amountMinor }) => ({ lotId: lot.id, debitEntryId: debit.id, amountMinor })),
      );
      return operation;
    });
  }

  async reserve(input: Omit<MonetaryOperationInput, "kind" | "entries"> & {
    amountMinor: bigint;
  }): Promise<MonetaryOperationResult> {
    return this.debitAvailableWithLots({
      ...input,
      kind: "RESERVE",
      amountMinor: input.amountMinor,
      creditReserved: true,
    });
  }

  async releaseReserved(input: Omit<MonetaryOperationInput, "programVersionId" | "kind" | "entries"> & {
    reserveTransactionId: string;
    amountMinor: bigint;
  }): Promise<MonetaryOperationResult> {
    return this.repository.runInTransaction(async () => {
      const previous = await this.existingOperation(input.wallet.id, input.idempotencyKey, input.requestHash);
      if (previous) return previous;
      await this.lockWalletForOperation(input.wallet.id, true);
      const reserve = await this.requireReserve(input.wallet.id, input.reserveTransactionId);
      const originalAmount = await this.reserveAmount(reserve);
      const settled = await this.settledReserveAmount(input.wallet.id, reserve.id);
      if (input.amountMinor <= 0n || settled + input.amountMinor > originalAmount) {
        throw new LoyaltyDomainError("MONETARY_RELEASE_EXCEEDS_RESERVATION", "Released credit exceeds the original reservation");
      }
      const chunks = await this.originalReserveChunks(input.wallet.id, reserve, settled, input.amountMinor);
      const operation = await this.applyInside({
        ...input,
        programVersionId: reserve.programVersionId,
        kind: "RELEASE",
        metadata: {
          ...input.metadata,
          reserveTransactionId: reserve.id,
          amountMinor: input.amountMinor.toString(),
          allocationOffset: settled.toString(),
        },
        entries: [
          { bucket: "RESERVED", amountMinorDelta: -input.amountMinor },
          ...chunks.map(({ amountMinor }) => ({ bucket: "AVAILABLE" as const, amountMinorDelta: amountMinor })),
        ],
      });
      if (operation.created) await this.createRestoredLots(input.wallet.id, operation, chunks);
      return operation;
    });
  }

  async spendReserved(input: Omit<MonetaryOperationInput, "programVersionId" | "kind" | "entries"> & {
    reserveTransactionId: string;
    amountMinor: bigint;
  }): Promise<MonetaryOperationResult> {
    return this.repository.runInTransaction(async () => {
      const previous = await this.existingOperation(input.wallet.id, input.idempotencyKey, input.requestHash);
      if (previous) return previous;
      await this.lockWalletForOperation(input.wallet.id, true);
      const reserve = await this.requireReserve(input.wallet.id, input.reserveTransactionId);
      const originalAmount = await this.reserveAmount(reserve);
      const settled = await this.settledReserveAmount(input.wallet.id, reserve.id);
      if (input.amountMinor <= 0n || settled + input.amountMinor > originalAmount) {
        throw new LoyaltyDomainError("MONETARY_SPEND_EXCEEDS_RESERVATION", "Spent credit exceeds the original reservation");
      }
      return this.applyInside({
        ...input,
        programVersionId: reserve.programVersionId,
        kind: "SPEND",
        metadata: {
          ...input.metadata,
          reserveTransactionId: reserve.id,
          amountMinor: input.amountMinor.toString(),
          allocationOffset: settled.toString(),
        },
        entries: [{ bucket: "RESERVED", amountMinorDelta: -input.amountMinor }],
      });
    });
  }

  async restoreSpend(input: Omit<MonetaryOperationInput, "programVersionId" | "kind" | "entries"> & {
    spendTransactionId: string;
    amountMinor: bigint;
  }): Promise<MonetaryOperationResult> {
    return this.repository.runInTransaction(async () => {
      const previous = await this.existingOperation(input.wallet.id, input.idempotencyKey, input.requestHash);
      if (previous) return previous;
      await this.lockWalletForOperation(input.wallet.id, true);
      const spend = await this.repository.wallet.findTransactionById(input.spendTransactionId);
      if (!spend || spend.walletId !== input.wallet.id || spend.kind !== "SPEND") {
        throw new LoyaltyDomainError("MONETARY_SPEND_NOT_FOUND", "Monetary spend transaction was not found");
      }
      const reserveTransactionId = typeof spend.metadata.reserveTransactionId === "string"
        ? spend.metadata.reserveTransactionId
        : null;
      if (!reserveTransactionId) throw new LoyaltyDomainError("MONETARY_AUDIT_INCOMPLETE", "Spend reservation audit is missing", true);
      const reserve = await this.requireReserve(input.wallet.id, reserveTransactionId);
      const spendAmount = BigInt(String(spend.metadata.amountMinor ?? "0"));
      const transactions = await this.repository.wallet.listAllTransactions(input.wallet.id);
      const restored = transactions
        .filter((transaction) => transaction.kind === "RESTORE_SPEND"
          && transaction.metadata.spendTransactionId === spend.id)
        .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.amountMinor ?? "0")), 0n);
      if (input.amountMinor <= 0n || restored + input.amountMinor > spendAmount) {
        throw new LoyaltyDomainError("MONETARY_RESTORE_EXCEEDS_SPEND", "Restored credit exceeds the original spend");
      }
      const allocationOffset = BigInt(String(spend.metadata.allocationOffset ?? "0")) + restored;
      const chunks = await this.originalReserveChunks(
        input.wallet.id,
        reserve,
        allocationOffset,
        input.amountMinor,
      );
      const operation = await this.applyInside({
        ...input,
        programVersionId: spend.programVersionId,
        kind: "RESTORE_SPEND",
        metadata: {
          ...input.metadata,
          reserveTransactionId: reserve.id,
          spendTransactionId: spend.id,
          amountMinor: input.amountMinor.toString(),
        },
        entries: chunks.map(({ amountMinor }) => ({
          bucket: "AVAILABLE" as const,
          amountMinorDelta: amountMinor,
        })),
      });
      if (operation.created) await this.createRestoredLots(input.wallet.id, operation, chunks);
      return operation;
    });
  }

  async reverseCredit(input: Omit<MonetaryOperationInput, "kind" | "entries"> & {
    originalTransactionId: string;
    amountMinor: bigint;
    debtPolicy: "TRACK_DEBT" | "REJECT_REVERSAL";
  }): Promise<MonetaryOperationResult & { debtAmountMinor: bigint }> {
    return this.repository.runInTransaction(async () => {
      const previous = await this.existingOperation(input.wallet.id, input.idempotencyKey, input.requestHash);
      if (previous) {
        return {
          ...previous,
          debtAmountMinor: BigInt(String(previous.transaction.metadata.debtAmountMinor ?? "0")),
        };
      }
      await this.lockWalletForOperation(input.wallet.id, true);
      const original = await this.repository.wallet.findTransactionById(input.originalTransactionId);
      if (!original || original.walletId !== input.wallet.id) {
        throw new LoyaltyDomainError("MONETARY_EARNING_NOT_FOUND", "Original monetary earning was not found");
      }
      const originalEntries = await this.repository.wallet.listEntries(original.id);
      const originalRecovered = originalEntries
        .filter(({ bucket, amountMinorDelta }) => bucket === "DEBT" && amountMinorDelta < 0n)
        .reduce((sum, { amountMinorDelta }) => sum - amountMinorDelta, 0n);
      const originalCredited = originalEntries
        .filter(({ bucket, amountMinorDelta }) =>
          (bucket === "PENDING" || bucket === "AVAILABLE") && amountMinorDelta > 0n,
        )
        .reduce((sum, { amountMinorDelta }) => sum + amountMinorDelta, 0n);
      const originalAmount = originalRecovered + originalCredited;
      const previousReversals = (await this.repository.wallet.listAllTransactions(input.wallet.id))
        .filter((transaction) => transaction.kind === "REVERSE_EARN"
          && transaction.metadata.originalTransactionId === original.id);
      const previouslyReversed = previousReversals
        .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.amountMinor ?? "0")), 0n);
      if (input.amountMinor <= 0n || previouslyReversed + input.amountMinor > originalAmount) {
        throw new LoyaltyDomainError(
          "MONETARY_REVERSAL_EXCEEDS_EARNING",
          "Monetary reversal exceeds the original earning",
        );
      }
      const recoveredBefore = previouslyReversed < originalRecovered
        ? previouslyReversed
        : originalRecovered;
      const recoveredAfter = previouslyReversed + input.amountMinor < originalRecovered
        ? previouslyReversed + input.amountMinor
        : originalRecovered;
      const recoveredDebt = recoveredAfter - recoveredBefore;
      const creditedToReverse = input.amountMinor - recoveredDebt;
      const balance = await this.requireBalance(input.wallet.id, true);
      const pending = balance.pendingAmountMinor < creditedToReverse
        ? balance.pendingAmountMinor
        : creditedToReverse;
      const afterPending = creditedToReverse - pending;
      const available = balance.availableAmountMinor < afterPending
        ? balance.availableAmountMinor
        : afterPending;
      const shortage = afterPending - available;
      const debtAmountMinor = recoveredDebt + shortage;
      if (debtAmountMinor > 0n && input.debtPolicy === "REJECT_REVERSAL") {
        throw new LoyaltyDomainError(
          "MONETARY_REVERSAL_WOULD_CREATE_DEBT",
          "Monetary earning reversal exceeds the wallet balance",
        );
      }
      const operation = await this.applyInside({
        ...input,
        programVersionId: original.programVersionId,
        kind: "REVERSE_EARN",
        metadata: {
          ...input.metadata,
          originalTransactionId: original.id,
          amountMinor: input.amountMinor.toString(),
          recoveredDebtAmountMinor: recoveredDebt.toString(),
          debtAmountMinor: debtAmountMinor.toString(),
        },
        entries: [
          ...(pending > 0n ? [{ bucket: "PENDING" as const, amountMinorDelta: -pending }] : []),
          ...(available > 0n ? [{ bucket: "AVAILABLE" as const, amountMinorDelta: -available }] : []),
          ...(debtAmountMinor > 0n ? [{ bucket: "DEBT" as const, amountMinorDelta: debtAmountMinor }] : []),
        ],
      });
      if (operation.created) {
        for (const [bucket, amountMinor] of [["PENDING", pending], ["AVAILABLE", available]] as const) {
          if (amountMinor <= 0n) continue;
          const debit = operation.entries.find((entry) =>
            entry.bucket === bucket && entry.amountMinorDelta < 0n,
          );
          if (!debit) throw new LoyaltyDomainError("MONETARY_LEDGER_INTEGRITY", "Reversal debit entry is missing", true);
          const allocations = await this.allocateLots(
            input.wallet.id,
            input.effectiveAt,
            amountMinor,
            bucket,
          );
          await this.repository.wallet.createLotAllocations(allocations.map(({ lot, amountMinor: allocated }) => ({
            lotId: lot.id,
            debitEntryId: debit.id,
            amountMinor: allocated,
          })));
        }
      }
      return { ...operation, debtAmountMinor };
    });
  }

  async convertPointsToMoney(input: {
    account: Account;
    walletType: LoyaltyMonetaryWalletType;
    programVersionId: string;
    currencyCode: string;
    points: bigint;
    idempotencyKey: string;
    requestHash: string;
    occurredAt: string;
  }): Promise<{ pointsTransactionId: string; monetaryTransactionId: string; amountMinor: bigint }> {
    return this.repository.runInTransaction(async () => {
      if (input.account.status !== "ACTIVE") {
        throw new LoyaltyDomainError("ACCOUNT_NOT_ACTIVE", "Points can be converted only for an active loyalty account");
      }
      const version = await this.repository.program.findVersionById(input.programVersionId);
      if (!version || version.programId !== input.account.programId) {
        throw new LoyaltyDomainError("PROGRAM_VERSION_NOT_FOUND", "Loyalty program version was not found");
      }
      const amountMinor = divideRounded(input.points * version.redeemAmountMinor, version.redeemPoints, "DOWN");
      if (amountMinor <= 0n) throw new LoyaltyDomainError("CONVERSION_TOO_SMALL", "Points conversion produces no monetary credit");
      const wallet = await this.ensureWallet(input.account, input.walletType, input.currencyCode);
      const points = new PointsLedgerService(this.repository);
      const pointOperation = await points.moveWithLotAllocation({
        account: input.account,
        programVersionId: version.id,
        kind: "ADJUST_DEBIT",
        source: "SYSTEM",
        sourceId: wallet.id,
        sourceRevision: String(wallet.revision),
        idempotencyKey: `points-conversion:${input.idempotencyKey}`,
        requestHash: input.requestHash,
        actorType: "SYSTEM",
        reasonCode: "POINTS_TO_MONETARY_CONVERSION",
        occurredAt: input.occurredAt,
        effectiveAt: input.occurredAt,
        metadata: { walletId: wallet.id, amountMinor: amountMinor.toString(), currencyCode: input.currencyCode },
        entries: [{ bucket: "AVAILABLE", pointsDelta: -input.points }],
        lifetime: { adjusted: -input.points },
        debitBucket: "AVAILABLE",
        points: input.points,
        allocationType: "REDEEM",
      });
      const monetary = await this.credit({
        wallet,
        programVersionId: version.id,
        kind: "ADJUST_CREDIT",
        sourceType: "POINTS_CONVERSION",
        sourceId: pointOperation.transaction.id,
        sourceRevision: "1",
        idempotencyKey: `money-conversion:${input.idempotencyKey}`,
        requestHash: input.requestHash,
        actorType: "SYSTEM",
        reasonCode: "POINTS_TO_MONETARY_CONVERSION",
        occurredAt: input.occurredAt,
        effectiveAt: input.occurredAt,
        amountMinor,
        activationAt: input.occurredAt,
        expiresAt: version.pointsExpiryDays === null
          ? null
          : new Date(Date.parse(input.occurredAt) + version.pointsExpiryDays * 86_400_000).toISOString(),
        metadata: { pointsTransactionId: pointOperation.transaction.id, points: input.points.toString() },
      });
      return { pointsTransactionId: pointOperation.transaction.id, monetaryTransactionId: monetary.transaction.id, amountMinor };
    });
  }

  async expireWallet(wallet: MonetaryWallet, at: string): Promise<MonetaryOperationResult[]> {
    return this.repository.runInTransaction(async () => {
      await this.lockWalletForOperation(wallet.id);
      await this.requireBalance(wallet.id, true);
      const lots = await this.repository.wallet.lockExpiredCreditLots(wallet.id, at);
      const remaining = await this.remainingByLot(lots);
      const results: MonetaryOperationResult[] = [];
      for (const lot of lots) {
        const origin = await this.repository.wallet.findEntryById(lot.originEntryId);
        const sourceTransaction = origin
          ? await this.repository.wallet.findTransactionById(origin.transactionId)
          : null;
        const activation = origin?.bucket === "PENDING"
          ? await this.repository.wallet.findTransactionByIdempotencyKey(wallet.id, `activate:${lot.id}`)
          : null;
        const debitBucket = origin?.bucket === "PENDING" && !activation
          ? "PENDING" as const
          : "AVAILABLE" as const;
        const amountMinor = remaining.get(lot.id) ?? 0n;
        if (amountMinor <= 0n) continue;
        results.push(await this.debitAvailableWithLots({
          wallet,
          programVersionId: sourceTransaction?.programVersionId ?? null,
          kind: "EXPIRE",
          sourceType: "EXPIRATION",
          sourceId: lot.id,
          sourceRevision: "1",
          idempotencyKey: `expire:${lot.id}`,
          requestHash: canonicalHash({ lotId: lot.id, amountMinor: amountMinor.toString() }),
          actorType: "SYSTEM",
          reasonCode: "MONETARY_CREDIT_EXPIRED",
          occurredAt: at,
          effectiveAt: at,
          amountMinor,
          debitBucket,
          lotIds: [lot.id],
        }));
      }
      return results;
    });
  }

  async activateDue(wallet: MonetaryWallet, at: string): Promise<MonetaryOperationResult[]> {
    return this.repository.runInTransaction(async () => {
      await this.lockWalletForOperation(wallet.id);
      await this.requireBalance(wallet.id, true);
      const lots = await this.repository.wallet.lockUsableCreditLots(wallet.id, at);
      const remaining = await this.remainingByLot(lots);
      const results: MonetaryOperationResult[] = [];
      for (const lot of lots) {
        const previous = await this.repository.wallet.findTransactionByIdempotencyKey(wallet.id, `activate:${lot.id}`);
        if (previous) continue;
        const origin = await this.repository.wallet.findEntryById(lot.originEntryId);
        if (origin?.bucket !== "PENDING") continue;
        const sourceTransaction = await this.repository.wallet.findTransactionById(origin.transactionId);
        const amountMinor = remaining.get(lot.id) ?? 0n;
        if (amountMinor <= 0n) continue;
        results.push(await this.applyInside({
          wallet,
          programVersionId: sourceTransaction?.programVersionId ?? null,
          kind: "ACTIVATE",
          sourceType: "SYSTEM",
          sourceId: lot.id,
          sourceRevision: "1",
          idempotencyKey: `activate:${lot.id}`,
          requestHash: canonicalHash({ lotId: lot.id, amountMinor: amountMinor.toString() }),
          actorType: "SYSTEM",
          reasonCode: "MONETARY_ACTIVATION_DELAY_ELAPSED",
          occurredAt: at,
          effectiveAt: at,
          entries: [
            { bucket: "PENDING", amountMinorDelta: -amountMinor },
            { bucket: "AVAILABLE", amountMinorDelta: amountMinor },
          ],
        }));
      }
      return results;
    });
  }

  async transferForMerge(input: {
    sourceWallet: MonetaryWallet;
    targetWallet: MonetaryWallet;
    mergeId: string;
    mergeRevision: number;
    occurredAt: string;
    requestHash: string;
  }): Promise<void> {
    await this.repository.runInTransaction(async () => {
      for (const id of [input.sourceWallet.id, input.targetWallet.id].sort()) {
        await this.lockWalletForOperation(id, id === input.sourceWallet.id);
      }
      const balance = await this.requireBalance(input.sourceWallet.id, true);
      if (balance.reservedAmountMinor > 0n) {
        throw new LoyaltyDomainError(
          "WALLET_HAS_ACTIVE_RESERVATIONS",
          "A wallet with reserved credit cannot be merged",
          true,
        );
      }
      for (const bucket of ["PENDING", "AVAILABLE"] as const) {
        const amount = bucket === "PENDING"
          ? balance.pendingAmountMinor
          : balance.availableAmountMinor;
        if (amount <= 0n) continue;
        const chunks = await this.remainingLotChunks(
          input.sourceWallet.id,
          bucket,
          amount,
        );
        const source = await this.applyInside({
          wallet: input.sourceWallet,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          sourceType: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:${bucket}:out`,
          idempotencyKey: `merge:${input.mergeId}:${input.sourceWallet.id}:${bucket}:out`,
          requestHash: input.requestHash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries: [{ bucket, amountMinorDelta: -amount }],
        });
        if (source.created) {
          const debitEntry = source.entries.find(({ amountMinorDelta }) => amountMinorDelta < 0n);
          if (!debitEntry) throw new LoyaltyDomainError("MONETARY_LEDGER_INTEGRITY", "Merge debit entry is missing", true);
          await this.repository.wallet.createLotAllocations(chunks.map(({ lot, amountMinor }) => ({
            lotId: lot.id,
            debitEntryId: debitEntry.id,
            amountMinor,
          })));
        }
        const target = await this.applyInside({
          wallet: input.targetWallet,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          sourceType: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:${bucket}:in`,
          idempotencyKey: `merge:${input.mergeId}:${input.targetWallet.id}:${bucket}:in`,
          requestHash: input.requestHash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries: chunks.map(({ amountMinor }) => ({ bucket, amountMinorDelta: amountMinor })),
        });
        if (target.created) {
          const creditEntries = target.entries.filter(({ amountMinorDelta }) => amountMinorDelta > 0n);
          if (creditEntries.length !== chunks.length) {
            throw new LoyaltyDomainError("MONETARY_LEDGER_INTEGRITY", "Merge credit lots do not match entries", true);
          }
          await this.repository.wallet.createCreditLots(chunks.map(({ lot, amountMinor }, index) => ({
            walletId: input.targetWallet.id,
            originEntryId: creditEntries[index]!.id,
            amountIssuedMinor: amountMinor,
            activatedAt: lot.activatedAt,
            expiresAt: lot.expiresAt,
          })));
        }
      }
      if (balance.debtAmountMinor > 0n) {
        const entries = [{ bucket: "DEBT" as const, amountMinorDelta: -balance.debtAmountMinor }];
        await this.applyInside({
          wallet: input.sourceWallet,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          sourceType: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:debt:out`,
          idempotencyKey: `merge:${input.mergeId}:${input.sourceWallet.id}:debt:out`,
          requestHash: input.requestHash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries,
        });
        await this.applyInside({
          wallet: input.targetWallet,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          sourceType: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:debt:in`,
          idempotencyKey: `merge:${input.mergeId}:${input.targetWallet.id}:debt:in`,
          requestHash: input.requestHash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries: [{ bucket: "DEBT", amountMinorDelta: balance.debtAmountMinor }],
        });
      }
    });
  }

  async rebuildBalance(walletId: string): Promise<MonetaryWalletBalance> {
    return this.repository.runInTransaction(async () => {
      await this.repository.wallet.lockById(walletId);
      await this.requireBalance(walletId, true);
      const [entries, transactions] = await Promise.all([
        this.repository.wallet.listEntriesForWallet(walletId),
        this.repository.wallet.listAllTransactions(walletId),
      ]);
      const totals: Record<MonetaryBucket, bigint> = {
        PENDING: 0n,
        AVAILABLE: 0n,
        RESERVED: 0n,
        DEBT: 0n,
      };
      for (const entry of entries) totals[entry.bucket] += entry.amountMinorDelta;
      const balance = await this.repository.wallet.replaceBalance(walletId, {
        pendingAmountMinor: totals.PENDING,
        availableAmountMinor: totals.AVAILABLE,
        reservedAmountMinor: totals.RESERVED,
        debtAmountMinor: totals.DEBT,
        lastTransactionId: transactions.at(-1)?.id ?? null,
      });
      if (!balance) throw new LoyaltyDomainError("WALLET_BALANCE_NOT_FOUND", "Monetary wallet balance was not found");
      return balance;
    });
  }

  private async applyInside(input: MonetaryOperationInput): Promise<MonetaryOperationResult> {
    const existing = await this.repository.wallet.findTransactionByIdempotencyKey(input.wallet.id, input.idempotencyKey);
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new LoyaltyDomainError("IDEMPOTENCY_CONFLICT", "Monetary idempotency conflict");
      const [entries, balance] = await Promise.all([
        this.repository.wallet.listEntries(existing.id),
        this.requireBalance(input.wallet.id),
      ]);
      return { transaction: existing, entries, balance, created: false };
    }
    const wallet = await this.repository.wallet.lockById(input.wallet.id);
    if (!wallet) throw new LoyaltyDomainError("WALLET_NOT_FOUND", "Monetary wallet was not found");
    if (wallet.status === "MERGED"
      || (requiresActiveWallet(input.kind) && wallet.status !== "ACTIVE")) {
      throw new LoyaltyDomainError("WALLET_NOT_ACTIVE", "Monetary wallet is not active");
    }
    const balance = await this.requireBalance(wallet.id, true);
    const entries = input.entries.filter(({ amountMinorDelta }) => amountMinorDelta !== 0n);
    if (entries.length === 0) throw new LoyaltyDomainError("EMPTY_TRANSACTION", "A monetary transaction requires ledger entries");
    const next = this.applyEntries(balance, entries);
    const appended = await this.repository.wallet.appendTransaction(
      {
        walletId: wallet.id,
        programId: wallet.programId,
        programVersionId: input.programVersionId,
        kind: input.kind,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        sourceRevision: input.sourceRevision ?? null,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        reasonCode: input.reasonCode,
        occurredAt: input.occurredAt,
        effectiveAt: input.effectiveAt,
        metadata: input.metadata ?? {},
      },
      entries.map((entry, index) => ({ ...entry, sequence: index + 1 })),
    );
    const updated = await this.repository.wallet.updateBalance(wallet.id, balance.revision, {
      ...next,
      lastTransactionId: appended.transaction.id,
    });
    if (!updated) throw new LoyaltyDomainError("CONCURRENT_WALLET_BALANCE_CHANGE", "Monetary wallet balance changed concurrently", true);
    return { ...appended, balance: updated, created: true };
  }

  private async existingOperation(
    walletId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<MonetaryOperationResult | null> {
    const transaction = await this.repository.wallet.findTransactionByIdempotencyKey(walletId, idempotencyKey);
    if (!transaction) return null;
    if (transaction.requestHash !== requestHash) {
      throw new LoyaltyDomainError("IDEMPOTENCY_CONFLICT", "Monetary idempotency conflict");
    }
    const [entries, balance] = await Promise.all([
      this.repository.wallet.listEntries(transaction.id),
      this.requireBalance(walletId),
    ]);
    return { transaction, entries, balance, created: false };
  }

  private async lockWalletForOperation(walletId: string, allowSettlement = false): Promise<void> {
    const wallet = await this.repository.wallet.lockById(walletId);
    if (!wallet) throw new LoyaltyDomainError("WALLET_NOT_FOUND", "Monetary wallet was not found");
    if (wallet.status === "MERGED" || (!allowSettlement && wallet.status !== "ACTIVE")) {
      throw new LoyaltyDomainError("WALLET_NOT_ACTIVE", "Monetary wallet is not active");
    }
  }

  private async requireReserve(
    walletId: string,
    transactionId: string,
  ): Promise<MonetaryTransaction> {
    const transaction = await this.repository.wallet.findTransactionById(transactionId);
    if (!transaction || transaction.walletId !== walletId || transaction.kind !== "RESERVE") {
      throw new LoyaltyDomainError("MONETARY_RESERVATION_NOT_FOUND", "Monetary reservation transaction was not found");
    }
    return transaction;
  }

  private async reserveAmount(reserve: MonetaryTransaction): Promise<bigint> {
    const entries = await this.repository.wallet.listEntries(reserve.id);
    const debit = entries.find(({ bucket, amountMinorDelta }) =>
      bucket === "AVAILABLE" && amountMinorDelta < 0n,
    );
    if (!debit) throw new LoyaltyDomainError("MONETARY_AUDIT_INCOMPLETE", "Reservation debit audit is missing", true);
    return -debit.amountMinorDelta;
  }

  private async settledReserveAmount(walletId: string, reserveTransactionId: string): Promise<bigint> {
    const transactions = await this.repository.wallet.listAllTransactions(walletId);
    return transactions
      .filter((transaction) => (transaction.kind === "RELEASE" || transaction.kind === "SPEND")
        && transaction.metadata.reserveTransactionId === reserveTransactionId)
      .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.amountMinor ?? "0")), 0n);
  }

  private async originalReserveChunks(
    walletId: string,
    reserve: MonetaryTransaction,
    skipped: bigint,
    requested: bigint,
  ): Promise<{ lot: MonetaryCreditLot; amountMinor: bigint }[]> {
    const entries = await this.repository.wallet.listEntries(reserve.id);
    const debit = entries.find(({ bucket, amountMinorDelta }) =>
      bucket === "AVAILABLE" && amountMinorDelta < 0n,
    );
    if (!debit) throw new LoyaltyDomainError("MONETARY_AUDIT_INCOMPLETE", "Reservation lot debit is missing", true);
    const lots = await this.repository.wallet.listCreditLots(walletId);
    const allocations = await this.repository.wallet.listLotAllocations(lots.map(({ id }) => id));
    const byId = new Map(lots.map((lot) => [lot.id, lot]));
    const chunks: { lot: MonetaryCreditLot; amountMinor: bigint }[] = [];
    let offset = skipped;
    let remaining = requested;
    for (const allocation of allocations.filter(({ debitEntryId }) => debitEntryId === debit.id)) {
      if (remaining === 0n) break;
      const lot = byId.get(allocation.lotId);
      if (!lot) continue;
      if (offset >= allocation.amountMinor) {
        offset -= allocation.amountMinor;
        continue;
      }
      const available = allocation.amountMinor - offset;
      offset = 0n;
      const amountMinor = available < remaining ? available : remaining;
      chunks.push({ lot, amountMinor });
      remaining -= amountMinor;
    }
    if (remaining > 0n) throw new LoyaltyDomainError("MONETARY_AUDIT_INCOMPLETE", "Reservation lots do not cover the requested amount", true);
    return chunks;
  }

  private async createRestoredLots(
    walletId: string,
    operation: MonetaryOperationResult,
    chunks: readonly { lot: MonetaryCreditLot; amountMinor: bigint }[],
  ): Promise<void> {
    const credits = operation.entries.filter(({ bucket, amountMinorDelta }) =>
      bucket === "AVAILABLE" && amountMinorDelta > 0n,
    );
    if (credits.length !== chunks.length) {
      throw new LoyaltyDomainError("MONETARY_LEDGER_INTEGRITY", "Restored monetary lots do not match ledger credits", true);
    }
    await this.repository.wallet.createCreditLots(chunks.map(({ lot, amountMinor }, index) => ({
      walletId,
      originEntryId: credits[index]!.id,
      amountIssuedMinor: amountMinor,
      activatedAt: lot.expiresAt
        && Date.parse(lot.expiresAt) <= Date.parse(operation.transaction.occurredAt)
        ? lot.activatedAt
        : operation.transaction.occurredAt,
      expiresAt: lot.expiresAt,
    })));
  }

  private applyEntries(balance: MonetaryWalletBalance, entries: readonly MonetaryEntryChange[]) {
    const next = {
      pendingAmountMinor: balance.pendingAmountMinor,
      availableAmountMinor: balance.availableAmountMinor,
      reservedAmountMinor: balance.reservedAmountMinor,
      debtAmountMinor: balance.debtAmountMinor,
    };
    for (const entry of entries) {
      if (entry.bucket === "PENDING") next.pendingAmountMinor += entry.amountMinorDelta;
      if (entry.bucket === "AVAILABLE") next.availableAmountMinor += entry.amountMinorDelta;
      if (entry.bucket === "RESERVED") next.reservedAmountMinor += entry.amountMinorDelta;
      if (entry.bucket === "DEBT") next.debtAmountMinor += entry.amountMinorDelta;
    }
    if (next.pendingAmountMinor < 0n || next.availableAmountMinor < 0n || next.reservedAmountMinor < 0n || next.debtAmountMinor < 0n) {
      throw new LoyaltyDomainError("INSUFFICIENT_MONETARY_BALANCE", "Monetary operation would make a balance bucket negative");
    }
    return next;
  }

  private async requireBalance(walletId: string, lock = false): Promise<MonetaryWalletBalance> {
    const balance = lock
      ? await this.repository.wallet.lockBalance(walletId)
      : await this.repository.wallet.findBalance(walletId);
    if (!balance) throw new LoyaltyDomainError("WALLET_BALANCE_NOT_FOUND", "Monetary wallet balance was not found");
    return balance;
  }

  private async allocateLots(
    walletId: string,
    at: string,
    amountMinor: bigint,
    bucket: "AVAILABLE" | "PENDING",
    expired = false,
    lotIds?: readonly string[],
  ) {
    let lots = lotIds
      ? await this.repository.wallet.lockCreditLotsByIds(walletId, lotIds)
      : expired
        ? await this.repository.wallet.lockExpiredCreditLots(walletId, at)
        : bucket === "AVAILABLE"
          ? await this.repository.wallet.lockUsableCreditLots(walletId, at)
          : await this.repository.wallet.lockAllCreditLots(walletId);
    if (!lotIds && bucket === "PENDING") {
      const pending: MonetaryCreditLot[] = [];
      for (const lot of lots) {
        const origin = await this.repository.wallet.findEntryById(lot.originEntryId);
        if (origin?.bucket !== "PENDING") continue;
        const activation = await this.repository.wallet.findTransactionByIdempotencyKey(walletId, `activate:${lot.id}`);
        if (!activation) pending.push(lot);
      }
      lots = pending;
    }
    const remaining = await this.remainingByLot(lots);
    let required = amountMinor;
    const result: { lot: MonetaryCreditLot; amountMinor: bigint }[] = [];
    for (const lot of lots) {
      const available = remaining.get(lot.id) ?? 0n;
      if (available <= 0n) continue;
      const allocated = available < required ? available : required;
      result.push({ lot, amountMinor: allocated });
      required -= allocated;
      if (required === 0n) break;
    }
    if (required > 0n) throw new LoyaltyDomainError("INSUFFICIENT_MONETARY_LOTS", "Monetary lots do not cover the debit", true);
    return result;
  }

  private async remainingByLot(lots: readonly MonetaryCreditLot[]): Promise<Map<string, bigint>> {
    const allocations = await this.repository.wallet.listLotAllocations(lots.map(({ id }) => id));
    const allocated = new Map<string, bigint>();
    for (const allocation of allocations) allocated.set(allocation.lotId, (allocated.get(allocation.lotId) ?? 0n) + allocation.amountMinor);
    return new Map(lots.map((lot) => [lot.id, lot.amountIssuedMinor - (allocated.get(lot.id) ?? 0n)]));
  }

  private async remainingLotChunks(
    walletId: string,
    bucket: "PENDING" | "AVAILABLE",
    required: bigint,
  ): Promise<{ lot: MonetaryCreditLot; amountMinor: bigint }[]> {
    const lots = await this.repository.wallet.listCreditLots(walletId);
    const remaining = await this.remainingByLot(lots);
    const chunks: { lot: MonetaryCreditLot; amountMinor: bigint }[] = [];
    let outstanding = required;
    for (const lot of lots) {
      const origin = await this.repository.wallet.findEntryById(lot.originEntryId);
      const activation = origin?.bucket === "PENDING"
        ? await this.repository.wallet.findTransactionByIdempotencyKey(walletId, `activate:${lot.id}`)
        : null;
      const isPending = origin?.bucket === "PENDING" && !activation;
      if ((bucket === "PENDING") !== isPending) continue;
      const available = remaining.get(lot.id) ?? 0n;
      if (available <= 0n) continue;
      const amountMinor = available < outstanding ? available : outstanding;
      chunks.push({ lot, amountMinor });
      outstanding -= amountMinor;
      if (outstanding === 0n) break;
    }
    if (outstanding > 0n) {
      throw new LoyaltyDomainError(
        "MERGE_MONETARY_LOT_MISMATCH",
        "Monetary lots do not cover the wallet balance projection",
        true,
      );
    }
    return chunks;
  }
}

function requiresActiveWallet(kind: NewMonetaryTransaction["kind"]): boolean {
  return kind === "EARN_PENDING"
    || kind === "RESERVE"
    || kind === "ADJUST_CREDIT"
    || kind === "ADJUST_DEBIT"
    || kind === "ACTIVATE";
}
