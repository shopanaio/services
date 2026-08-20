import type { Repository } from "../../repositories/Repository.js";
import type {
  Account,
  AccountBalance,
  LedgerEntry,
  LoyaltyTransaction,
  NewLedgerEntry,
  NewLoyaltyTransaction,
  PointLot,
} from "../../repositories/models/index.js";
import type { LoyaltyBalanceBucket, LoyaltyLotAllocationType } from "../../contracts/types.js";
import { LoyaltyDomainError } from "../errors.js";
import { canonicalHash } from "../math.js";

export interface LedgerEntryChange {
  bucket: LoyaltyBalanceBucket;
  pointsDelta: bigint;
}

export interface AppendPointsOperation {
  account: Account;
  programVersionId: string | null;
  kind: NewLoyaltyTransaction["kind"];
  source: NewLoyaltyTransaction["source"];
  sourceId?: string | null;
  sourceRevision?: string | null;
  idempotencyKey: string;
  requestHash: string;
  correlationId?: string | null;
  causationId?: string | null;
  eventId?: string | null;
  workflowId?: string | null;
  actorType: NewLoyaltyTransaction["actorType"];
  actorId?: string | null;
  reasonCode: string;
  description?: string | null;
  occurredAt: string;
  effectiveAt: string;
  metadata?: Record<string, unknown>;
  entries: readonly LedgerEntryChange[];
  lifetime?: Partial<{
    earned: bigint;
    redeemed: bigint;
    expired: bigint;
    adjusted: bigint;
  }>;
}

export interface AppendedPointsOperation {
  transaction: LoyaltyTransaction;
  entries: LedgerEntry[];
  balance: AccountBalance;
  created: boolean;
}

export class PointsLedgerService {
  constructor(private readonly repository: Repository) {}

  async ensureAccount(customerId: string, programId: string): Promise<Account> {
    return this.repository.runInTransaction(async () => {
      const existing = await this.repository.account.findByCustomerAndProgram(
        customerId,
        programId,
      );
      if (existing) return existing;
      const account = await this.repository.account.createIfMissing({ customerId, programId });
      await this.repository.balance.createIfMissing({ accountId: account.id });
      return account;
    });
  }

  async append(input: AppendPointsOperation): Promise<AppendedPointsOperation> {
    return this.repository.runInTransaction(() => this.appendInsideTransaction(input));
  }

  async award(
    input: Omit<AppendPointsOperation, "kind" | "entries" | "lifetime"> & {
      points: bigint;
      activationAt: string;
      expiresAt: string | null;
      operationKind?: "EARN_PENDING" | "ADJUST_CREDIT";
    },
  ): Promise<AppendedPointsOperation & { lot: PointLot | null }> {
    if (input.points <= 0n)
      throw new LoyaltyDomainError("INVALID_AWARD", "Awarded points must be positive");
    return this.repository.runInTransaction(async () => {
      const account = await this.repository.account.lockById(input.account.id);
      if (!account)
        throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      const balance = await this.requireBalance(input.account.id, true);
      const recoveredDebt = balance.debtPoints < input.points ? balance.debtPoints : input.points;
      const credited = input.points - recoveredDebt;
      const bucket: LoyaltyBalanceBucket =
        Date.parse(input.activationAt) > Date.parse(input.occurredAt) ? "PENDING" : "AVAILABLE";
      const operation = await this.appendInsideTransaction({
        ...input,
        kind: input.operationKind ?? "EARN_PENDING",
        entries: [
          ...(recoveredDebt > 0n ? [{ bucket: "DEBT" as const, pointsDelta: -recoveredDebt }] : []),
          ...(credited > 0n ? [{ bucket, pointsDelta: credited }] : []),
        ],
        lifetime:
          input.operationKind === "ADJUST_CREDIT"
            ? { adjusted: input.points }
            : { earned: input.points },
        metadata: {
          ...input.metadata,
          points: input.points.toString(),
          ...(input.operationKind === "ADJUST_CREDIT"
            ? {}
            : { awardedPoints: input.points.toString() }),
          recoveredDebtPoints: recoveredDebt.toString(),
          creditedPoints: credited.toString(),
          activationAt: input.activationAt,
          expiresAt: input.expiresAt,
        },
      });
      if (!operation.created || credited === 0n) return { ...operation, lot: null };
      const origin = operation.entries.find(
        (entry) => entry.pointsDelta > 0n && entry.bucket === bucket,
      );
      if (!origin)
        throw new LoyaltyDomainError(
          "LEDGER_INTEGRITY_ERROR",
          "Award credit entry was not created",
          true,
        );
      const [lot] = await this.repository.ledger.createPointLots([
        {
          programId: input.account.programId,
          accountId: input.account.id,
          originEntryId: origin.id,
          pointsIssued: credited,
          activatedAt: input.activationAt,
          expiresAt: input.expiresAt,
        },
      ]);
      return { ...operation, lot: lot ?? null };
    });
  }

  async moveWithLotAllocation(
    input: AppendPointsOperation & {
      debitBucket: "AVAILABLE" | "PENDING";
      points: bigint;
      allocationType: LoyaltyLotAllocationType;
      lotIds?: readonly string[];
    },
  ): Promise<
    AppendedPointsOperation & { allocations: readonly { lot: PointLot; points: bigint }[] }
  > {
    const operation = await this.moveWithLotAllocations({
      ...input,
      lotDebits: [
        {
          bucket: input.debitBucket,
          points: input.points,
          allocationType: input.allocationType,
          lotIds: input.lotIds,
        },
      ],
    });
    return { ...operation, allocations: operation.allocations };
  }

  async moveWithLotAllocations(
    input: AppendPointsOperation & {
      lotDebits: readonly {
        bucket: "AVAILABLE" | "PENDING";
        points: bigint;
        allocationType: LoyaltyLotAllocationType;
        lotIds?: readonly string[];
      }[];
    },
  ): Promise<
    AppendedPointsOperation & { allocations: readonly { lot: PointLot; points: bigint }[] }
  > {
    return this.repository.runInTransaction(async () => {
      const operation = await this.appendInsideTransaction(input);
      if (!operation.created) return { ...operation, allocations: [] };
      const allAllocations: { lot: PointLot; points: bigint }[] = [];
      for (const lotDebit of input.lotDebits) {
        if (lotDebit.points <= 0n) continue;
        const debit = operation.entries.find(
          (entry) => entry.bucket === lotDebit.bucket && entry.pointsDelta < 0n,
        );
        if (!debit)
          throw new LoyaltyDomainError(
            "LEDGER_INTEGRITY_ERROR",
            "Lot debit entry was not created",
            true,
          );
        const allocations = await this.allocateLots(
          input.account.id,
          input.effectiveAt,
          lotDebit.points,
          lotDebit.bucket,
          lotDebit.allocationType === "EXPIRE",
          lotDebit.lotIds,
        );
        await this.repository.ledger.createLotAllocations(
          allocations.map(({ lot, points }) => ({
            lotId: lot.id,
            debitEntryId: debit.id,
            transactionId: operation.transaction.id,
            allocationType: lotDebit.allocationType,
            points,
          })),
        );
        allAllocations.push(...allocations);
      }
      return { ...operation, allocations: allAllocations };
    });
  }

  async restoreLots(
    input: Omit<AppendPointsOperation, "entries"> & {
      debitEntries?: readonly LedgerEntryChange[];
      creditBucket?: "AVAILABLE" | "PENDING";
      lots: readonly { points: bigint; activatedAt: string; expiresAt: string | null }[];
    },
  ): Promise<AppendedPointsOperation & { lots: PointLot[] }> {
    return this.repository.runInTransaction(async () => {
      const operation = await this.appendInsideTransaction({
        ...input,
        entries: [
          ...(input.debitEntries ?? []),
          ...input.lots.map(({ points }) => ({
            bucket: input.creditBucket ?? "AVAILABLE",
            pointsDelta: points,
          })),
        ],
      });
      if (!operation.created) return { ...operation, lots: [] };
      const creditEntries = operation.entries.filter(
        ({ bucket, pointsDelta }) =>
          bucket === (input.creditBucket ?? "AVAILABLE") && pointsDelta > 0n,
      );
      if (creditEntries.length !== input.lots.length) {
        throw new LoyaltyDomainError(
          "LEDGER_INTEGRITY_ERROR",
          "Restored point lots do not match ledger credits",
          true,
        );
      }
      const lots = await this.repository.ledger.createPointLots(
        input.lots.map((lot, index) => ({
          programId: input.account.programId,
          accountId: input.account.id,
          originEntryId: creditEntries[index]!.id,
          pointsIssued: lot.points,
          activatedAt: lot.activatedAt,
          expiresAt: lot.expiresAt,
        })),
      );
      return { ...operation, lots };
    });
  }

  async activateDueLots(account: Account, effectiveAt: string): Promise<AppendedPointsOperation[]> {
    return this.repository.runInTransaction(async () => {
      await this.repository.account.lockById(account.id);
      await this.requireBalance(account.id, true);
      const lots = await this.repository.ledger.lockUsablePointLots(account.id, effectiveAt);
      const remaining = await this.remainingByLot(lots);
      const results: AppendedPointsOperation[] = [];
      for (const lot of lots) {
        const previous = await this.repository.ledger.findTransactionByIdempotencyKey(
          `activate:${lot.id}`,
        );
        if (previous) continue;
        const origin = await this.repository.ledger.findEntryById(lot.originEntryId);
        if (origin?.bucket !== "PENDING") continue;
        const sourceTransaction = await this.repository.ledger.findTransactionById(
          origin.transactionId,
        );
        const points = remaining.get(lot.id) ?? 0n;
        if (points === 0n || Date.parse(lot.activatedAt) > Date.parse(effectiveAt)) continue;
        const operation = await this.appendInsideTransaction({
          account,
          programVersionId: sourceTransaction?.programVersionId ?? null,
          kind: "ACTIVATE",
          source: "SYSTEM",
          sourceId: lot.id,
          sourceRevision: "1",
          idempotencyKey: `activate:${lot.id}`,
          requestHash: canonicalHash({ lotId: lot.id, points: points.toString() }),
          actorType: "SYSTEM",
          reasonCode: "ACTIVATION_DELAY_ELAPSED",
          occurredAt: effectiveAt,
          effectiveAt,
          metadata: { lotId: lot.id },
          entries: [
            { bucket: "PENDING", pointsDelta: -points },
            { bucket: "AVAILABLE", pointsDelta: points },
          ],
        });
        results.push(operation);
      }
      return results;
    });
  }

  async expireLots(account: Account, effectiveAt: string): Promise<AppendedPointsOperation[]> {
    return this.repository.runInTransaction(async () => {
      await this.repository.account.lockById(account.id);
      await this.requireBalance(account.id, true);
      const lots = await this.repository.ledger.lockExpiredPointLots(account.id, effectiveAt);
      const remaining = await this.remainingByLot(lots);
      const results: AppendedPointsOperation[] = [];
      for (const lot of lots) {
        const origin = await this.repository.ledger.findEntryById(lot.originEntryId);
        const sourceTransaction = origin
          ? await this.repository.ledger.findTransactionById(origin.transactionId)
          : null;
        const activation =
          origin?.bucket === "PENDING"
            ? await this.repository.ledger.findTransactionByIdempotencyKey(`activate:${lot.id}`)
            : null;
        const debitBucket =
          origin?.bucket === "PENDING" && !activation
            ? ("PENDING" as const)
            : ("AVAILABLE" as const);
        const points = remaining.get(lot.id) ?? 0n;
        if (points === 0n) continue;
        const operation = await this.moveWithLotAllocation({
          account,
          programVersionId: sourceTransaction?.programVersionId ?? null,
          kind: "EXPIRE",
          source: "EXPIRATION",
          sourceId: lot.id,
          sourceRevision: "1",
          idempotencyKey: `expire:${lot.id}`,
          requestHash: canonicalHash({ lotId: lot.id, points: points.toString() }),
          actorType: "SYSTEM",
          reasonCode: "POINT_LOT_EXPIRED",
          occurredAt: effectiveAt,
          effectiveAt,
          metadata: { lotId: lot.id },
          entries: [{ bucket: debitBucket, pointsDelta: -points }],
          lifetime: { expired: points },
          debitBucket,
          points,
          allocationType: "EXPIRE",
          lotIds: [lot.id],
        });
        results.push(operation);
      }
      return results;
    });
  }

  async rebuildBalance(accountId: string): Promise<AccountBalance> {
    return this.repository.runInTransaction(async () => {
      await this.requireBalance(accountId);
      const [entries, transactions] = await Promise.all([
        this.repository.ledger.listEntriesForAccount(accountId),
        this.repository.ledger.listAllTransactions(accountId),
      ]);
      const totals: Record<LoyaltyBalanceBucket, bigint> = {
        PENDING: 0n,
        AVAILABLE: 0n,
        RESERVED: 0n,
        DEBT: 0n,
      };
      for (const entry of entries) totals[entry.bucket] += entry.pointsDelta;
      let earned = 0n;
      let redeemed = 0n;
      let expired = 0n;
      let adjusted = 0n;
      for (const transaction of transactions) {
        const transactionEntries = entries.filter(
          ({ transactionId }) => transactionId === transaction.id,
        );
        const positive = transactionEntries.reduce(
          (sum, entry) => sum + (entry.pointsDelta > 0n ? entry.pointsDelta : 0n),
          0n,
        );
        const negative = transactionEntries.reduce(
          (sum, entry) => sum + (entry.pointsDelta < 0n ? -entry.pointsDelta : 0n),
          0n,
        );
        if (transaction.kind === "EARN_PENDING") {
          earned += BigInt(String(transaction.metadata.awardedPoints ?? positive));
        }
        if (transaction.kind === "REDEEM") redeemed += negative;
        if (transaction.kind === "EXPIRE") expired += negative;
        if (transaction.kind === "ADJUST_CREDIT") {
          adjusted += BigInt(String(transaction.metadata.points ?? positive));
        }
        if (transaction.kind === "ADJUST_DEBIT") adjusted -= negative;
      }
      const updated = await this.repository.balance.replace(accountId, {
        pendingPoints: totals.PENDING,
        availablePoints: totals.AVAILABLE,
        reservedPoints: totals.RESERVED,
        debtPoints: totals.DEBT,
        lifetimeEarnedPoints: earned,
        lifetimeRedeemedPoints: redeemed,
        lifetimeExpiredPoints: expired,
        lifetimeAdjustedPoints: adjusted,
        lastTransactionId: transactions.at(-1)?.id ?? null,
      });
      if (!updated)
        throw new LoyaltyDomainError(
          "BALANCE_NOT_FOUND",
          "Account balance projection was not found",
        );
      return updated;
    });
  }

  private async appendInsideTransaction(
    input: AppendPointsOperation,
  ): Promise<AppendedPointsOperation> {
    const existing = await this.repository.ledger.findTransactionByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) {
      if (existing.requestHash !== input.requestHash) {
        throw new LoyaltyDomainError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key was already used with another request",
        );
      }
      const [entries, balance] = await Promise.all([
        this.repository.ledger.listEntries(existing.id),
        this.requireBalance(existing.accountId),
      ]);
      return { transaction: existing, entries, balance, created: false };
    }
    const account = await this.repository.account.lockById(input.account.id);
    if (!account)
      throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
    if (requiresActiveAccount(input.kind) && account.status !== "ACTIVE") {
      throw new LoyaltyDomainError("ACCOUNT_NOT_ACTIVE", "Loyalty account is not active");
    }
    const balance = await this.requireBalance(account.id, true);
    const entries = input.entries.filter(({ pointsDelta }) => pointsDelta !== 0n);
    if (entries.length === 0)
      throw new LoyaltyDomainError(
        "EMPTY_TRANSACTION",
        "A points transaction requires ledger entries",
      );
    const next = this.applyEntries(balance, entries, input.lifetime);
    const appended = await this.repository.ledger.appendTransaction(
      {
        accountId: account.id,
        programId: account.programId,
        programVersionId: input.programVersionId,
        kind: input.kind,
        source: input.source,
        sourceId: input.sourceId ?? null,
        sourceRevision: input.sourceRevision ?? null,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        correlationId: input.correlationId ?? null,
        causationId: input.causationId ?? null,
        eventId: input.eventId ?? null,
        workflowId: input.workflowId ?? null,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        reasonCode: input.reasonCode,
        description: input.description ?? null,
        occurredAt: input.occurredAt,
        effectiveAt: input.effectiveAt,
        metadata: input.metadata ?? {},
      },
      entries.map(
        (entry, index): Omit<NewLedgerEntry, "storeId" | "transactionId" | "accountId"> => ({
          bucket: entry.bucket,
          pointsDelta: entry.pointsDelta,
          sequence: index + 1,
        }),
      ),
    );
    const updated = await this.repository.balance.update(account.id, balance.revision, {
      ...next,
      lastTransactionId: appended.transaction.id,
    });
    if (!updated)
      throw new LoyaltyDomainError(
        "CONCURRENT_BALANCE_CHANGE",
        "Loyalty balance changed concurrently",
        true,
      );
    return { ...appended, balance: updated, created: true };
  }

  private applyEntries(
    balance: AccountBalance,
    entries: readonly LedgerEntryChange[],
    lifetime: AppendPointsOperation["lifetime"],
  ): Pick<
    AccountBalance,
    | "pendingPoints"
    | "availablePoints"
    | "reservedPoints"
    | "debtPoints"
    | "lifetimeEarnedPoints"
    | "lifetimeRedeemedPoints"
    | "lifetimeExpiredPoints"
    | "lifetimeAdjustedPoints"
  > {
    const next = {
      pendingPoints: balance.pendingPoints,
      availablePoints: balance.availablePoints,
      reservedPoints: balance.reservedPoints,
      debtPoints: balance.debtPoints,
      lifetimeEarnedPoints: balance.lifetimeEarnedPoints + (lifetime?.earned ?? 0n),
      lifetimeRedeemedPoints: balance.lifetimeRedeemedPoints + (lifetime?.redeemed ?? 0n),
      lifetimeExpiredPoints: balance.lifetimeExpiredPoints + (lifetime?.expired ?? 0n),
      lifetimeAdjustedPoints: balance.lifetimeAdjustedPoints + (lifetime?.adjusted ?? 0n),
    };
    for (const entry of entries) {
      if (entry.bucket === "PENDING") next.pendingPoints += entry.pointsDelta;
      if (entry.bucket === "AVAILABLE") next.availablePoints += entry.pointsDelta;
      if (entry.bucket === "RESERVED") next.reservedPoints += entry.pointsDelta;
      if (entry.bucket === "DEBT") next.debtPoints += entry.pointsDelta;
    }
    if (
      next.pendingPoints < 0n ||
      next.availablePoints < 0n ||
      next.reservedPoints < 0n ||
      next.debtPoints < 0n
    ) {
      throw new LoyaltyDomainError(
        "INSUFFICIENT_BALANCE",
        "Points operation would make a balance bucket negative",
      );
    }
    return next;
  }

  private async requireBalance(accountId: string, lock = false): Promise<AccountBalance> {
    const balance = lock
      ? await this.repository.balance.lockByAccountId(accountId)
      : await this.repository.balance.findByAccountId(accountId);
    if (!balance)
      throw new LoyaltyDomainError("BALANCE_NOT_FOUND", "Loyalty balance projection was not found");
    return balance;
  }

  private async remainingByLot(lots: readonly PointLot[]): Promise<Map<string, bigint>> {
    const allocations = await this.repository.ledger.listLotAllocations(lots.map(({ id }) => id));
    const allocated = new Map<string, bigint>();
    for (const allocation of allocations) {
      allocated.set(allocation.lotId, (allocated.get(allocation.lotId) ?? 0n) + allocation.points);
    }
    return new Map(lots.map((lot) => [lot.id, lot.pointsIssued - (allocated.get(lot.id) ?? 0n)]));
  }

  private async allocateLots(
    accountId: string,
    effectiveAt: string,
    points: bigint,
    bucket: "AVAILABLE" | "PENDING",
    expired = false,
    lotIds?: readonly string[],
  ): Promise<{ lot: PointLot; points: bigint }[]> {
    let lots = lotIds
      ? await this.repository.ledger.lockPointLotsByIds(accountId, lotIds)
      : expired
        ? await this.repository.ledger.lockExpiredPointLots(accountId, effectiveAt)
        : bucket === "AVAILABLE"
          ? await this.repository.ledger.lockUsablePointLots(accountId, effectiveAt)
          : await this.repository.ledger.lockAllPointLots(accountId);
    if (!lotIds && bucket === "PENDING") {
      const pending: PointLot[] = [];
      for (const lot of lots) {
        const origin = await this.repository.ledger.findEntryById(lot.originEntryId);
        if (origin?.bucket !== "PENDING") continue;
        const activation = await this.repository.ledger.findTransactionByIdempotencyKey(
          `activate:${lot.id}`,
        );
        if (!activation) pending.push(lot);
      }
      lots = pending;
    }
    const remaining = await this.remainingByLot(lots);
    let required = points;
    const selected: { lot: PointLot; points: bigint }[] = [];
    for (const lot of lots) {
      const available = remaining.get(lot.id) ?? 0n;
      if (available <= 0n) continue;
      const allocated = available < required ? available : required;
      selected.push({ lot, points: allocated });
      required -= allocated;
      if (required === 0n) break;
    }
    if (required > 0n)
      throw new LoyaltyDomainError(
        "INSUFFICIENT_POINT_LOTS",
        "Spendable point lots do not cover the requested amount",
        true,
      );
    return selected;
  }
}

function requiresActiveAccount(kind: NewLoyaltyTransaction["kind"]): boolean {
  return (
    kind === "EARN_PENDING" ||
    kind === "RESERVE" ||
    kind === "ADJUST_CREDIT" ||
    kind === "ADJUST_DEBIT" ||
    kind === "ACTIVATE"
  );
}
