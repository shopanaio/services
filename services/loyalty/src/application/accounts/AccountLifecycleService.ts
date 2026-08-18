import type { Repository } from "../../repositories/Repository.js";
import type { Account, AccountBalance } from "../../repositories/models/index.js";
import { LoyaltyDomainError } from "../errors.js";
import { canonicalHash } from "../math.js";
import { PointsLedgerService } from "../ledger/PointsLedgerService.js";
import { MonetaryWalletService } from "../wallet/MonetaryWalletService.js";

export class AccountLifecycleService {
  private readonly points: PointsLedgerService;

  constructor(private readonly repository: Repository) {
    this.points = new PointsLedgerService(repository);
  }

  async changeStatus(input: {
    accountId: string;
    status: "ACTIVE" | "SUSPENDED" | "CLOSED";
    reason?: string;
    occurredAt: string;
    expectedRevision?: number;
  }): Promise<Account> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.account.lockById(input.accountId);
      if (!current) throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      if (current.status === "MERGED") throw new LoyaltyDomainError("ACCOUNT_MERGED", "Merged accounts cannot change state");
      if (current.status === "CLOSED") {
        if (input.status === "CLOSED") return current;
        throw new LoyaltyDomainError("ACCOUNT_CLOSED", "A closed loyalty account cannot be reopened");
      }
      if (current.status === input.status && input.status !== "SUSPENDED") return current;
      const updated = await this.repository.account.updateState(current.id, input.status === "SUSPENDED"
        ? { status: "SUSPENDED", suspendedReason: input.reason ?? "ADMIN_SUSPENDED", suspendedAt: input.occurredAt, closedAt: null }
        : input.status === "CLOSED"
          ? { status: "CLOSED", closedAt: input.occurredAt, suspendedReason: null, suspendedAt: null }
          : { status: "ACTIVE", closedAt: null, suspendedReason: null, suspendedAt: null },
      input.expectedRevision ?? current.revision);
      if (!updated) throw new LoyaltyDomainError("ACCOUNT_CONCURRENT_CHANGE", "Loyalty account changed concurrently", true);
      return updated;
    });
  }

  async adjust(input: {
    accountId: string;
    expectedBalanceRevision?: number;
    points: bigint;
    direction: "CREDIT" | "DEBIT";
    reasonCode: string;
    description?: string;
    actorId: string;
    occurredAt: string;
    idempotencyKey: string;
    requestHash: string;
    expiresAt?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return this.repository.runInTransaction(async () => {
      const account = await this.repository.account.lockById(input.accountId);
      if (!account) throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      const balance = await this.repository.balance.lockByAccountId(input.accountId);
      if (!balance) throw new LoyaltyDomainError("BALANCE_NOT_FOUND", "Loyalty account balance was not found");
      if (input.expectedBalanceRevision !== undefined && balance.revision !== input.expectedBalanceRevision) {
        throw new LoyaltyDomainError("BALANCE_CONCURRENT_CHANGE", "Loyalty account balance changed concurrently", true);
      }
      if (input.points <= 0n) throw new LoyaltyDomainError("INVALID_ADJUSTMENT", "Adjustment points must be positive");
      if (input.direction === "CREDIT") {
        const expiresAt = input.expiresAt ?? null;
        const activationAt = expiresAt !== null && Date.parse(expiresAt) <= Date.parse(input.occurredAt)
          ? new Date(Date.parse(expiresAt) - 1).toISOString()
          : input.occurredAt;
        return this.points.award({
          account,
          programVersionId: null,
          source: "ADMIN",
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          actorType: "ADMIN_USER",
          actorId: input.actorId,
          reasonCode: input.reasonCode,
          description: input.description,
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          points: input.points,
          activationAt,
          expiresAt,
          operationKind: "ADJUST_CREDIT",
          metadata: { adjustment: true, ...(input.metadata ?? {}) },
        });
      }
      return this.points.moveWithLotAllocation({
        account,
        programVersionId: null,
        kind: "ADJUST_DEBIT",
        source: "ADMIN",
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        actorType: "ADMIN_USER",
        actorId: input.actorId,
        reasonCode: input.reasonCode,
        description: input.description,
        occurredAt: input.occurredAt,
        effectiveAt: input.occurredAt,
        entries: [{ bucket: "AVAILABLE", pointsDelta: -input.points }],
        lifetime: { adjusted: -input.points },
        debitBucket: "AVAILABLE",
        points: input.points,
        allocationType: "REDEEM",
        metadata: { adjustment: true, ...(input.metadata ?? {}) },
      });
    });
  }

  async mergeCustomers(input: {
    sourceCustomerId: string;
    targetCustomerId: string;
    mergeId: string;
    mergeRevision: number;
    occurredAt: string;
  }): Promise<void> {
    const sources = await this.repository.account.listByCustomer(input.sourceCustomerId);
    for (const source of sources) {
      if (source.status === "MERGED" || source.status === "CLOSED") continue;
      const target = await this.points.ensureAccount(input.targetCustomerId, source.programId);
      if (target.status !== "ACTIVE") {
        throw new LoyaltyDomainError(
          "MERGE_TARGET_NOT_ACTIVE",
          "The target customer loyalty account is not active",
        );
      }
      await this.mergeAccounts(source, target, input);
    }
  }

  async closeCustomer(customerId: string, occurredAt: string): Promise<void> {
    const accounts = await this.repository.account.listByCustomer(customerId);
    for (const account of accounts) {
      if (account.status === "MERGED") continue;
      await this.repository.runInTransaction(async () => {
        if (account.status !== "CLOSED") {
          await this.changeStatus({ accountId: account.id, status: "CLOSED", reason: "CUSTOMER_DELETED", occurredAt });
        }
        await this.closeWallets(account, occurredAt);
      });
    }
  }

  async closeStore(occurredAt: string): Promise<number> {
    const accounts = await this.repository.account.listAllForStore();
    let closed = 0;
    for (const account of accounts) {
      if (account.status === "MERGED") continue;
      await this.repository.runInTransaction(async () => {
        if (account.status !== "CLOSED") {
          await this.changeStatus({ accountId: account.id, status: "CLOSED", reason: "STORE_DELETED", occurredAt });
          closed += 1;
        }
        await this.closeWallets(account, occurredAt);
      });
    }
    return closed;
  }

  private async mergeAccounts(
    source: Account,
    target: Account,
    input: { mergeId: string; mergeRevision: number; occurredAt: string },
  ): Promise<void> {
    if (source.programId !== target.programId) throw new LoyaltyDomainError("MERGE_PROGRAM_MISMATCH", "Accounts from different programs cannot be merged");
    await this.repository.runInTransaction(async () => {
      for (const id of [source.id, target.id].sort()) await this.repository.account.lockById(id);
      const balanceByAccount = new Map<string, AccountBalance | null>();
      for (const id of [source.id, target.id].sort()) {
        balanceByAccount.set(id, await this.repository.balance.lockByAccountId(id));
      }
      const sourceBalance = balanceByAccount.get(source.id) ?? null;
      const targetBalance = balanceByAccount.get(target.id) ?? null;
      if (!sourceBalance || !targetBalance) throw new LoyaltyDomainError("BALANCE_NOT_FOUND", "Merge account balance was not found");
      const hash = canonicalHash({ source: source.id, target: target.id, mergeId: input.mergeId, revision: input.mergeRevision });
      for (const bucket of ["AVAILABLE", "PENDING"] as const) {
        const amount = bucket === "AVAILABLE" ? sourceBalance.availablePoints : sourceBalance.pendingPoints;
        if (amount === 0n) continue;
        const chunks = await this.remainingLotChunks(source.id, bucket, amount);
        await this.points.moveWithLotAllocation({
          account: source,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          source: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:${bucket}:out`,
          idempotencyKey: `merge:${input.mergeId}:${source.id}:${bucket}:out`,
          requestHash: hash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries: [{ bucket, pointsDelta: -amount }],
          debitBucket: bucket,
          points: amount,
          allocationType: "MERGE",
          lotIds: chunks.map(({ lotId }) => lotId),
        });
        await this.points.restoreLots({
          account: target,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          source: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:${bucket}:in`,
          idempotencyKey: `merge:${input.mergeId}:${target.id}:${bucket}:in`,
          requestHash: hash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          creditBucket: bucket,
          lots: chunks,
        });
      }
      if (sourceBalance.reservedPoints > 0n) {
        throw new LoyaltyDomainError("ACCOUNT_HAS_ACTIVE_RESERVATIONS", "An account with reserved points cannot be merged", true);
      }
      if (sourceBalance.debtPoints > 0n) {
        await this.points.append({
          account: source,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          source: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:debt:out`,
          idempotencyKey: `merge:${input.mergeId}:${source.id}:debt:out`,
          requestHash: hash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries: [{ bucket: "DEBT", pointsDelta: -sourceBalance.debtPoints }],
        });
        await this.points.append({
          account: target,
          programVersionId: null,
          kind: "MERGE_TRANSFER",
          source: "MERGE",
          sourceId: input.mergeId,
          sourceRevision: `${input.mergeRevision}:debt:in`,
          idempotencyKey: `merge:${input.mergeId}:${target.id}:debt:in`,
          requestHash: hash,
          actorType: "SYSTEM",
          reasonCode: "CUSTOMER_MERGED",
          occurredAt: input.occurredAt,
          effectiveAt: input.occurredAt,
          entries: [{ bucket: "DEBT", pointsDelta: sourceBalance.debtPoints }],
        });
      }
      const updated = await this.repository.account.updateState(source.id, {
        status: "MERGED",
        mergedIntoAccountId: target.id,
        closedAt: input.occurredAt,
        suspendedAt: null,
        suspendedReason: null,
      }, source.revision);
      if (!updated) throw new LoyaltyDomainError("ACCOUNT_CONCURRENT_CHANGE", "Source account changed concurrently", true);
      await this.mergeWallets(source, target, input);
    });
  }

  private async remainingLotChunks(
    accountId: string,
    bucket: "AVAILABLE" | "PENDING",
    required: bigint,
  ) {
    const lots = await this.repository.ledger.listPointLots(accountId);
    const allocations = await this.repository.ledger.listLotAllocations(lots.map(({ id }) => id));
    const spent = new Map<string, bigint>();
    for (const allocation of allocations) spent.set(allocation.lotId, (spent.get(allocation.lotId) ?? 0n) + allocation.points);
    let remaining = required;
    const chunks: { lotId: string; points: bigint; activatedAt: string; expiresAt: string | null }[] = [];
    for (const lot of lots) {
      const origin = await this.repository.ledger.findEntryById(lot.originEntryId);
      const activation = origin?.bucket === "PENDING"
        ? await this.repository.ledger.findTransactionByIdempotencyKey(`activate:${lot.id}`)
        : null;
      const pending = origin?.bucket === "PENDING" && !activation;
      const matches = bucket === "PENDING" ? pending : !pending;
      if (!matches) continue;
      const amount = lot.pointsIssued - (spent.get(lot.id) ?? 0n);
      if (amount <= 0n) continue;
      const used = amount < remaining ? amount : remaining;
      chunks.push({ lotId: lot.id, points: used, activatedAt: lot.activatedAt, expiresAt: lot.expiresAt });
      remaining -= used;
      if (remaining === 0n) break;
    }
    if (remaining > 0n) throw new LoyaltyDomainError("MERGE_LOT_MISMATCH", "Account lots do not cover the balance projection", true);
    return chunks;
  }

  private async mergeWallets(
    source: Account,
    target: Account,
    input: { mergeId: string; mergeRevision: number; occurredAt: string },
  ): Promise<void> {
    const wallets = await this.repository.wallet.listForAccount(source.id);
    const service = new MonetaryWalletService(this.repository);
    for (const wallet of wallets) {
      if (wallet.status === "CLOSED" || wallet.status === "MERGED") continue;
      const targetWallet = await service.ensureWallet(target, wallet.walletType, wallet.currencyCode);
      const hash = canonicalHash({ sourceWalletId: wallet.id, targetWalletId: targetWallet.id, mergeId: input.mergeId });
      await service.transferForMerge({
        sourceWallet: wallet,
        targetWallet,
        mergeId: input.mergeId,
        mergeRevision: input.mergeRevision,
        occurredAt: input.occurredAt,
        requestHash: hash,
      });
      const updated = await this.repository.wallet.updateWalletState(wallet.id, wallet.revision, {
        status: "MERGED",
        mergedIntoWalletId: targetWallet.id,
        closedAt: input.occurredAt,
      });
      if (!updated) throw new LoyaltyDomainError("WALLET_CONCURRENT_CHANGE", "Source wallet changed concurrently", true);
    }
  }

  private async closeWallets(account: Account, occurredAt: string): Promise<void> {
    const wallets = await this.repository.wallet.listForAccount(account.id);
    for (const wallet of wallets) {
      if (wallet.status === "CLOSED" || wallet.status === "MERGED") continue;
      const updated = await this.repository.wallet.updateWalletState(
        wallet.id,
        wallet.revision,
        { status: "CLOSED", closedAt: occurredAt },
      );
      if (!updated) throw new LoyaltyDomainError("WALLET_CONCURRENT_CHANGE", "Monetary wallet changed concurrently", true);
    }
  }

  private async requireAccount(id: string): Promise<Account> {
    const account = await this.repository.account.findById(id);
    if (!account) throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
    if (account.status !== "ACTIVE") throw new LoyaltyDomainError("ACCOUNT_NOT_ACTIVE", "Loyalty account is not active");
    return account;
  }
}
