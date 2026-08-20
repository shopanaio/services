import { randomUUID } from "node:crypto";
import type {
  CommitCheckoutLoyaltyRedemptionParams,
  CommitCheckoutLoyaltyRedemptionResult,
  ExpireCheckoutLoyaltyRedemptionsParams,
  ExpireCheckoutLoyaltyRedemptionsResult,
  LoyaltyAccountSnapshot,
  LoyaltyProgramSnapshot,
  LoyaltyRedemptionQuote,
  QuoteCheckoutLoyaltyRedemptionParams,
  QuoteCheckoutLoyaltyRedemptionResult,
  ReleaseCheckoutLoyaltyRedemptionParams,
  ReleaseCheckoutLoyaltyRedemptionResult,
  ReserveCheckoutLoyaltyRedemptionParams,
  ReserveCheckoutLoyaltyRedemptionResult,
  ReverseCheckoutLoyaltyRedemptionParams,
  ReverseCheckoutLoyaltyRedemptionResult,
  GetCustomerLoyaltyAccountParams,
  GetCustomerLoyaltyAccountResult,
} from "@shopana/broker-types";
import type { Repository } from "../../repositories/Repository.js";
import type {
  Account,
  Program,
  ProgramVersion,
  Reservation,
} from "../../repositories/models/index.js";
import type { LoyaltyProgramRulesV1 } from "../../contracts/types.js";
import { evaluateLoyaltyProgramEligibility } from "../../contracts/policy.js";
import { PointsLedgerService } from "../ledger/PointsLedgerService.js";
import { LoyaltyDomainError } from "../errors.js";
import {
  addDays,
  canonicalHash,
  divideRounded,
  multiplyBasisPoints,
  parsePoints,
  parsePositive,
} from "../math.js";

const SHA256 = /^[0-9a-f]{64}$/;
const CHECKOUT_RESERVATION_TTL_MS = 60 * 60_000;

export class CheckoutRedemptionService {
  private readonly points: PointsLedgerService;

  constructor(private readonly repository: Repository) {
    this.points = new PointsLedgerService(repository);
  }

  async getCustomerAccount(
    params: GetCustomerLoyaltyAccountParams,
  ): Promise<GetCustomerLoyaltyAccountResult> {
    const program = params.programId
      ? await this.repository.program.findById(params.programId)
      : await this.repository.program.findDefault();
    if (!program || program.status !== "ACTIVE") {
      return { found: false, code: "PROGRAM_NOT_FOUND", retryable: false };
    }
    const version = await this.repository.program.findEffectiveVersion(
      program.id,
      params.effectiveAt,
    );
    if (!version) return { found: false, code: "PROGRAM_NOT_FOUND", retryable: false };
    const account = await this.repository.account.findByCustomerAndProgram(
      params.customerId,
      program.id,
    );
    if (!account) return { found: false, code: "ACCOUNT_NOT_FOUND", retryable: false };
    const balance = await this.repository.balance.findByAccountId(account.id);
    if (!balance) return { found: false, code: "ACCOUNT_NOT_FOUND", retryable: false };
    const membership = await this.repository.tier.findActiveMembership(account.id);
    const tier = membership ? await this.repository.tier.findTierById(membership.tierId) : null;
    const expiring = await this.repository.balance.listExpiringPoints(account.id);
    const expiringPoints = expiring.reduce((sum, row) => sum + row.remainingPoints, 0n);
    const snapshot: LoyaltyAccountSnapshot = {
      accountId: account.id,
      storeId: account.storeId,
      customerId: account.customerId,
      status: account.status,
      program: this.programSnapshot(program, version),
      balance: {
        pendingPoints: balance.pendingPoints.toString(),
        availablePoints: balance.availablePoints.toString(),
        reservedPoints: balance.reservedPoints.toString(),
        debtPoints: balance.debtPoints.toString(),
        expiringPoints: expiringPoints.toString(),
        nextExpiryAt: expiring[0]?.expiresAt ?? null,
        revision: balance.revision,
      },
      tier:
        membership && tier
          ? {
              tierId: tier.id,
              code: tier.code,
              name: tier.name,
              rank: tier.rank,
              effectiveFrom: membership.effectiveFrom,
              effectiveTo: membership.effectiveTo,
            }
          : null,
      revision: canonicalHash({
        accountRevision: account.revision,
        balanceRevision: balance.revision,
        membershipRevision: membership?.revision ?? null,
      }),
    };
    return { found: true, account: snapshot };
  }

  async quote(
    params: QuoteCheckoutLoyaltyRedemptionParams,
  ): Promise<QuoteCheckoutLoyaltyRedemptionResult> {
    const { context } = params;
    if (!context.customerId)
      return { status: "NOT_APPLICABLE", code: "CUSTOMER_REQUIRED", retryable: false };
    if (Date.parse(context.requestedAt) >= Date.parse(context.deadlineAt)) {
      return this.rejected("DEADLINE_EXCEEDED", "Checkout loyalty deadline was exceeded", false);
    }
    const program = params.programId
      ? await this.repository.program.findById(params.programId)
      : await this.repository.program.findDefault();
    if (!program) return { status: "NOT_APPLICABLE", code: "PROGRAM_NOT_FOUND", retryable: false };
    if (program.status !== "ACTIVE")
      return this.rejected("PROGRAM_INACTIVE", "Loyalty program is not active", false);
    const version = await this.repository.program.findEffectiveVersion(
      program.id,
      context.effectiveAt,
    );
    if (!version)
      return this.rejected(
        "PROGRAM_INACTIVE",
        "No effective loyalty program version exists",
        false,
      );
    if (!version.redemptionEnabled)
      return this.rejected("REDEMPTION_DISABLED", "Loyalty redemption is disabled", false);
    if (
      program.defaultCurrencyCode !== context.currencyCode ||
      context.payableBeforeLoyalty.currencyCode !== context.currencyCode
    ) {
      return this.rejected(
        "CURRENCY_MISMATCH",
        "Checkout and loyalty program currencies differ",
        false,
      );
    }
    const rules = version.rules as unknown as LoyaltyProgramRulesV1;
    const eligibility = evaluateLoyaltyProgramEligibility(rules.eligibility, {
      channelCode: context.channelCode,
      segmentIds: context.segmentIds,
    });
    if (!eligibility.eligible) {
      return { status: "NOT_APPLICABLE", code: eligibility.code, retryable: false };
    }
    const account = await this.repository.account.findByCustomerAndProgram(
      context.customerId,
      program.id,
    );
    if (!account)
      return this.rejected("ACCOUNT_NOT_FOUND", "Customer loyalty account was not found", false);
    if (account.status !== "ACTIVE")
      return this.rejected("ACCOUNT_NOT_ACTIVE", "Customer loyalty account is not active", false);
    const balance = await this.repository.balance.findByAccountId(account.id);
    if (!balance || balance.availablePoints === 0n) {
      return { status: "NOT_APPLICABLE", code: "NO_AVAILABLE_POINTS", retryable: false };
    }
    const payable = parsePoints(
      context.payableBeforeLoyalty.amountMinor,
      "payableBeforeLoyalty.amountMinor",
    );
    if (payable === 0n) {
      return this.rejected(
        "BELOW_MINIMUM_REDEMPTION",
        "Checkout has no payable amount to redeem",
        false,
      );
    }
    const maxDiscount = multiplyBasisPoints(payable, version.maximumOrderPercentageBps, "DOWN");
    const byOrder = divideRounded(
      maxDiscount * version.redeemPoints,
      version.redeemAmountMinor,
      "DOWN",
    );
    let allowed = balance.availablePoints < byOrder ? balance.availablePoints : byOrder;
    if (
      version.maximumRedeemPointsPerOrder !== null &&
      allowed > version.maximumRedeemPointsPerOrder
    ) {
      allowed = version.maximumRedeemPointsPerOrder;
    }
    const requested =
      params.requestedPoints === null
        ? allowed
        : parsePoints(params.requestedPoints, "requestedPoints");
    if (requested > balance.availablePoints) {
      return this.rejected(
        "REQUEST_EXCEEDS_AVAILABLE_POINTS",
        "Requested points exceed the available balance",
        false,
      );
    }
    if (requested > allowed)
      return this.rejected(
        "REQUEST_EXCEEDS_ORDER_LIMIT",
        "Requested points exceed the order redemption limit",
        false,
      );
    if (requested < version.minimumRedeemPoints) {
      return this.rejected(
        "BELOW_MINIMUM_REDEMPTION",
        "Requested points are below the program minimum",
        false,
      );
    }
    const discountMinor = divideRounded(
      requested * version.redeemAmountMinor,
      version.redeemPoints,
      "DOWN",
    );
    if (discountMinor <= 0n)
      return this.rejected(
        "BELOW_MINIMUM_REDEMPTION",
        "Requested points produce no redeemable amount",
        false,
      );
    const expiresAt = new Date(
      Date.parse(context.requestedAt) + CHECKOUT_RESERVATION_TTL_MS,
    ).toISOString();
    const quoteBase = {
      quoteId: randomUUID(),
      accountId: account.id,
      accountRevision: balance.revision,
      program: this.programSnapshot(program, version),
      requestedPoints: params.requestedPoints,
      redeemablePoints: requested.toString(),
      discount: { amountMinor: discountMinor.toString(), currencyCode: context.currencyCode },
      payableAfterLoyalty: {
        amountMinor: (payable - discountMinor).toString(),
        currencyCode: context.currencyCode,
      },
      availablePoints: balance.availablePoints.toString(),
      expiresAt,
      basedOnCheckoutVersion: context.checkoutVersion,
      basedOnPricingQuoteRevision: context.pricingQuoteRevision,
      basedOnCustomerEligibilityRevision: context.customerEligibilityRevision,
    };
    const quote: LoyaltyRedemptionQuote = {
      ...quoteBase,
      revision: canonicalHash(quoteBase),
    };
    return { status: "QUOTED", quote };
  }

  async reserve(
    params: ReserveCheckoutLoyaltyRedemptionParams,
  ): Promise<ReserveCheckoutLoyaltyRedemptionResult> {
    try {
      this.requireHash(params.requestHash);
      return await this.repository.runInTransaction(async () => {
        const existing = await this.repository.reservation.findByIdempotencyKey(
          params.idempotencyKey,
        );
        if (existing) {
          if (existing.requestHash !== params.requestHash)
            return this.reserveRejected(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key conflicts with an existing reservation",
              false,
            );
          return this.reserved(existing, await this.requireReservationTransaction(existing));
        }
        const mismatch = this.quoteMismatch(params);
        if (mismatch) return this.reserveRejected("QUOTE_MISMATCH", mismatch, false);
        if (Date.parse(params.quote.expiresAt) <= Date.parse(params.context.requestedAt)) {
          return this.reserveRejected(
            "QUOTE_EXPIRED",
            "Loyalty redemption quote has expired",
            false,
          );
        }
        const account = await this.repository.account.lockById(params.quote.accountId);
        if (!account || account.status !== "ACTIVE")
          return this.reserveRejected("ACCOUNT_NOT_ACTIVE", "Loyalty account is not active", false);
        const points = parsePositive(params.quote.redeemablePoints, "quote.redeemablePoints");
        const balance = await this.repository.balance.lockByAccountId(account.id);
        if (!balance || balance.availablePoints < points) {
          return this.reserveRejected(
            "INSUFFICIENT_AVAILABLE_POINTS",
            "Available points changed after the quote",
            true,
          );
        }
        if (balance.revision !== params.quote.accountRevision) {
          return this.reserveRejected(
            "CONCURRENT_BALANCE_CHANGE",
            "Loyalty balance changed after the quote",
            true,
          );
        }
        const operation = await this.points.moveWithLotAllocation({
          account,
          programVersionId: params.quote.program.programVersionId,
          kind: "RESERVE",
          source: "CHECKOUT",
          sourceId: params.context.checkoutId,
          sourceRevision: String(params.context.checkoutVersion),
          idempotencyKey: `points:${params.idempotencyKey}`,
          requestHash: params.requestHash,
          correlationId: params.context.correlationId,
          actorType: "SERVICE",
          reasonCode: "CHECKOUT_REDEMPTION_RESERVED",
          occurredAt: params.context.requestedAt,
          effectiveAt: params.context.requestedAt,
          metadata: { quoteId: params.quote.quoteId, quoteRevision: params.quote.revision },
          entries: [
            { bucket: "AVAILABLE", pointsDelta: -points },
            { bucket: "RESERVED", pointsDelta: points },
          ],
          debitBucket: "AVAILABLE",
          points,
          allocationType: "REDEEM",
        });
        const reservation = await this.repository.reservation.create({
          programId: account.programId,
          programVersionId: params.quote.program.programVersionId,
          accountId: account.id,
          checkoutId: params.context.checkoutId,
          checkoutVersion: params.context.checkoutVersion,
          quoteId: params.quote.quoteId,
          quoteRevision: params.quote.revision,
          points,
          discountAmountMinor: parsePositive(
            params.quote.discount.amountMinor,
            "quote.discount.amountMinor",
          ),
          currencyCode: params.quote.discount.currencyCode,
          status: "ACTIVE",
          idempotencyKey: params.idempotencyKey,
          requestHash: params.requestHash,
          expiresAt: params.quote.expiresAt,
        });
        await this.repository.reservation.appendEvent({
          reservationId: reservation.id,
          eventType: "CREATED",
          previousStatus: null,
          status: "ACTIVE",
          transactionId: operation.transaction.id,
          idempotencyKey: params.idempotencyKey,
          reasonCode: "CHECKOUT_REDEMPTION_RESERVED",
          actorType: "SERVICE",
          occurredAt: params.context.requestedAt,
          metadata: { quoteId: params.quote.quoteId },
        });
        return this.reserved(reservation, operation.transaction.id);
      });
    } catch (error) {
      return this.reserveRejected(
        this.code(error, "CONCURRENT_BALANCE_CHANGE"),
        this.message(error),
        this.retryable(error),
      );
    }
  }

  async commit(
    params: CommitCheckoutLoyaltyRedemptionParams,
  ): Promise<CommitCheckoutLoyaltyRedemptionResult> {
    try {
      this.requireHash(params.requestHash);
      return await this.repository.runInTransaction(async () => {
        const reservation = await this.repository.reservation.lockById(params.reservationId);
        if (!reservation)
          return this.commitRejected(
            "RESERVATION_NOT_FOUND",
            "Loyalty reservation was not found",
            false,
          );
        if (reservation.status === "COMMITTED" && reservation.orderId === params.orderId) {
          const transaction = await this.repository.ledger.findTransactionByIdempotencyKey(
            `points:${params.idempotencyKey}`,
          );
          if (!transaction || transaction.requestHash !== params.requestHash)
            return this.commitRejected(
              "IDEMPOTENCY_CONFLICT",
              "Commit idempotency conflict",
              false,
            );
          return {
            status: "COMMITTED",
            reservationId: reservation.id,
            redemptionTransactionId: transaction.id,
            points: reservation.points.toString(),
            discount: {
              amountMinor: reservation.discountAmountMinor.toString(),
              currencyCode: reservation.currencyCode,
            },
            committedAt: reservation.committedAt!,
          };
        }
        if (reservation.status !== "ACTIVE")
          return this.commitRejected(
            "RESERVATION_NOT_ACTIVE",
            "Loyalty reservation is not active",
            false,
          );
        if (Date.parse(reservation.expiresAt) <= Date.parse(params.committedAt))
          return this.commitRejected(
            "RESERVATION_EXPIRED",
            "Loyalty reservation expired before commit",
            false,
          );
        if (
          reservation.checkoutId !== params.checkoutId ||
          reservation.checkoutVersion !== params.checkoutVersion
        )
          return this.commitRejected(
            "CHECKOUT_MISMATCH",
            "Checkout does not match the reservation",
            false,
          );
        if (
          reservation.quoteId !== params.quoteId ||
          reservation.quoteRevision !== params.quoteRevision
        )
          return this.commitRejected(
            "QUOTE_MISMATCH",
            "Quote does not match the reservation",
            false,
          );
        const account = await this.requireAccount(reservation.accountId);
        const operation = await this.points.append({
          account,
          programVersionId: reservation.programVersionId,
          kind: "REDEEM",
          source: "CHECKOUT",
          sourceId: params.orderId,
          sourceRevision: String(params.orderRevision),
          idempotencyKey: `points:${params.idempotencyKey}`,
          requestHash: params.requestHash,
          actorType: "SERVICE",
          reasonCode: "CHECKOUT_REDEMPTION_COMMITTED",
          occurredAt: params.committedAt,
          effectiveAt: params.committedAt,
          metadata: { reservationId: reservation.id, checkoutId: params.checkoutId },
          entries: [{ bucket: "RESERVED", pointsDelta: -reservation.points }],
          lifetime: { redeemed: reservation.points },
        });
        const updated = await this.repository.reservation.updateState(
          reservation.id,
          reservation.revision,
          {
            status: "COMMITTED",
            orderId: params.orderId,
            orderRevision: params.orderRevision,
            committedAt: params.committedAt,
          },
        );
        if (!updated)
          return this.commitRejected(
            "RESERVATION_NOT_ACTIVE",
            "Reservation changed concurrently",
            true,
          );
        await this.repository.reservation.appendEvent({
          reservationId: reservation.id,
          eventType: "COMMITTED",
          previousStatus: "ACTIVE",
          status: "COMMITTED",
          transactionId: operation.transaction.id,
          idempotencyKey: params.idempotencyKey,
          reasonCode: "CHECKOUT_REDEMPTION_COMMITTED",
          actorType: "SERVICE",
          occurredAt: params.committedAt,
        });
        return {
          status: "COMMITTED",
          reservationId: reservation.id,
          redemptionTransactionId: operation.transaction.id,
          points: reservation.points.toString(),
          discount: {
            amountMinor: reservation.discountAmountMinor.toString(),
            currencyCode: reservation.currencyCode,
          },
          committedAt: params.committedAt,
        };
      });
    } catch (error) {
      return this.commitRejected(
        this.code(error, "RESERVATION_NOT_ACTIVE"),
        this.message(error),
        this.retryable(error),
      );
    }
  }

  async release(
    params: ReleaseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReleaseCheckoutLoyaltyRedemptionResult> {
    return this.releaseOrExpire(params, "RELEASED", params.releasedAt);
  }

  async releaseAdmin(
    params: ReleaseCheckoutLoyaltyRedemptionParams & {
      expectedRevision: number;
      reasonCode: string;
    },
  ): Promise<ReleaseCheckoutLoyaltyRedemptionResult> {
    return this.releaseOrExpire(params, "RELEASED", params.releasedAt);
  }

  async expire(
    params: ExpireCheckoutLoyaltyRedemptionsParams,
  ): Promise<ExpireCheckoutLoyaltyRedemptionsResult> {
    const candidates = await this.repository.runInTransaction(() =>
      this.repository.reservation.listExpiredCandidates(params.effectiveAt, params.limit ?? 100),
    );
    const expired: Array<{
      reservationId: string;
      releaseTransactionId: string;
      points: string;
    }> = [];
    for (const reservation of candidates) {
      const result = await this.releaseOrExpire(
        {
          storeId: params.storeId,
          checkoutId: reservation.checkoutId,
          reservationId: reservation.id,
          reason: "CHECKOUT_CANCELLED",
          releasedAt: params.effectiveAt,
          idempotencyKey: `expire:${reservation.id}`,
          requestHash: canonicalHash({
            reservationId: reservation.id,
            expiresAt: reservation.expiresAt,
          }),
        },
        "EXPIRED",
        params.effectiveAt,
      );
      if (result.status === "RELEASED")
        expired.push({
          reservationId: result.reservationId,
          releaseTransactionId: result.releaseTransactionId,
          points: result.points,
        });
    }
    return { expired, hasMore: candidates.length === (params.limit ?? 100) };
  }

  async reverse(
    params: ReverseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReverseCheckoutLoyaltyRedemptionResult> {
    try {
      this.requireHash(params.requestHash);
      return await this.repository.runInTransaction(async () => {
        const reservation = await this.repository.reservation.lockById(params.reservationId);
        if (!reservation)
          return this.reverseRejected(
            "RESERVATION_NOT_FOUND",
            "Loyalty reservation was not found",
            false,
          );
        const prior = await this.repository.ledger.findTransactionByIdempotencyKey(
          `points:${params.idempotencyKey}`,
        );
        if (prior) {
          if (prior.requestHash !== params.requestHash) {
            return this.reverseRejected(
              "IDEMPOTENCY_CONFLICT",
              "Reversal idempotency conflict",
              false,
            );
          }
          const balance = await this.repository.balance.findByAccountId(reservation.accountId);
          return {
            status: "REVERSED",
            reservationId: reservation.id,
            restoreTransactionId: prior.id,
            points: String(prior.metadata.points ?? params.points),
            availablePoints: (balance?.availablePoints ?? 0n).toString(),
          };
        }
        if (reservation.status !== "COMMITTED" && reservation.status !== "REVERSED")
          return this.reverseRejected(
            "RESERVATION_NOT_COMMITTED",
            "Reservation was not committed",
            false,
          );
        if (reservation.orderId !== params.orderId)
          return this.reverseRejected(
            "ORDER_MISMATCH",
            "Refund order does not match the reservation",
            false,
          );
        const points = parsePositive(params.points, "points");
        const account = await this.requireAccount(reservation.accountId);
        const transactions = await this.repository.ledger.listAllTransactions(account.id);
        const alreadyRestored = transactions
          .filter(
            (transaction) =>
              transaction.kind === "RESTORE_REDEEM" &&
              transaction.metadata.reservationId === reservation.id,
          )
          .reduce(
            (sum, transaction) => sum + BigInt(String(transaction.metadata.points ?? "0")),
            0n,
          );
        if (alreadyRestored + points > reservation.points)
          return this.reverseRejected(
            "REVERSAL_EXCEEDS_REDEMPTION",
            "Restored points exceed the original redemption",
            false,
          );
        const chunks = await this.originalLotChunks(
          reservation,
          points,
          params.occurredAt,
          alreadyRestored,
        );
        const operation = await this.points.restoreLots({
          account,
          programVersionId: reservation.programVersionId,
          kind: "RESTORE_REDEEM",
          source: "REFUND",
          sourceId: params.refundId,
          sourceRevision: String(params.refundRevision),
          idempotencyKey: `points:${params.idempotencyKey}`,
          requestHash: params.requestHash,
          actorType: "SERVICE",
          reasonCode: "CHECKOUT_REDEMPTION_REVERSED",
          occurredAt: params.occurredAt,
          effectiveAt: params.occurredAt,
          metadata: {
            reservationId: reservation.id,
            orderId: params.orderId,
            points: points.toString(),
            expiresAt: earliestExpiry(chunks),
          },
          lots: chunks,
        });
        if (alreadyRestored + points === reservation.points && reservation.status !== "REVERSED") {
          const updated = await this.repository.reservation.updateState(
            reservation.id,
            reservation.revision,
            { status: "REVERSED", reversedAt: params.occurredAt },
          );
          if (!updated)
            throw new LoyaltyDomainError(
              "RESERVATION_CONCURRENT_CHANGE",
              "Reservation changed concurrently",
              true,
            );
          await this.repository.reservation.appendEvent({
            reservationId: reservation.id,
            eventType: "REVERSED",
            previousStatus: "COMMITTED",
            status: "REVERSED",
            transactionId: operation.transaction.id,
            idempotencyKey: params.idempotencyKey,
            reasonCode: "CHECKOUT_REDEMPTION_REVERSED",
            actorType: "SERVICE",
            occurredAt: params.occurredAt,
          });
        }
        return {
          status: "REVERSED",
          reservationId: reservation.id,
          restoreTransactionId: operation.transaction.id,
          points: points.toString(),
          availablePoints: operation.balance.availablePoints.toString(),
        };
      });
    } catch (error) {
      return this.reverseRejected(
        this.code(error, "RESERVATION_NOT_COMMITTED"),
        this.message(error),
        this.retryable(error),
      );
    }
  }

  private async releaseOrExpire(
    params: ReleaseCheckoutLoyaltyRedemptionParams & {
      expectedRevision?: number;
      reasonCode?: string;
    },
    target: "RELEASED" | "EXPIRED",
    occurredAt: string,
  ): Promise<ReleaseCheckoutLoyaltyRedemptionResult> {
    try {
      this.requireHash(params.requestHash);
      return await this.repository.runInTransaction(async () => {
        const reservation = await this.repository.reservation.lockById(params.reservationId);
        if (!reservation)
          return {
            status: "REJECTED",
            code: "RESERVATION_NOT_FOUND",
            message: "Loyalty reservation was not found",
            retryable: false,
          };
        if (
          params.expectedRevision !== undefined &&
          reservation.revision !== params.expectedRevision
        ) {
          throw new LoyaltyDomainError(
            "RESERVATION_CONCURRENT_CHANGE",
            "Loyalty reservation changed concurrently",
            true,
          );
        }
        if (reservation.status !== "ACTIVE") {
          if (reservation.status === "COMMITTED")
            return {
              status: "REJECTED",
              code: "RESERVATION_COMMITTED",
              message: "Committed reservation cannot be released",
              retryable: false,
            };
          return {
            status: "NOOP",
            reservationId: reservation.id,
            currentStatus: reservation.status as "RELEASED" | "EXPIRED" | "REVERSED",
          };
        }
        if (reservation.checkoutId !== params.checkoutId)
          return {
            status: "REJECTED",
            code: "RESERVATION_NOT_FOUND",
            message: "Checkout does not match the reservation",
            retryable: false,
          };
        const account = await this.requireAccount(reservation.accountId);
        const chunks = await this.originalLotChunks(reservation, reservation.points, occurredAt);
        const operation = await this.points.restoreLots({
          account,
          programVersionId: reservation.programVersionId,
          kind: "RELEASE",
          source: target === "EXPIRED" ? "EXPIRATION" : "CHECKOUT",
          sourceId: reservation.id,
          sourceRevision: String(reservation.revision),
          idempotencyKey: `points:${params.idempotencyKey}`,
          requestHash: params.requestHash,
          actorType: "SERVICE",
          reasonCode:
            target === "EXPIRED" ? "RESERVATION_EXPIRED" : (params.reasonCode ?? params.reason),
          occurredAt,
          effectiveAt: occurredAt,
          metadata: { reservationId: reservation.id, checkoutId: reservation.checkoutId },
          debitEntries: [{ bucket: "RESERVED", pointsDelta: -reservation.points }],
          lots: chunks,
        });
        const updated = await this.repository.reservation.updateState(
          reservation.id,
          reservation.revision,
          target === "EXPIRED"
            ? { status: "EXPIRED", expiredAt: occurredAt }
            : { status: "RELEASED", releasedAt: occurredAt },
        );
        if (!updated)
          throw new LoyaltyDomainError(
            "RESERVATION_CONCURRENT_CHANGE",
            "Reservation changed concurrently",
            true,
          );
        await this.repository.reservation.appendEvent({
          reservationId: reservation.id,
          eventType: target === "EXPIRED" ? "EXPIRED" : "RELEASED",
          previousStatus: "ACTIVE",
          status: target,
          transactionId: operation.transaction.id,
          idempotencyKey: params.idempotencyKey,
          reasonCode:
            target === "EXPIRED" ? "RESERVATION_EXPIRED" : (params.reasonCode ?? params.reason),
          actorType: "SERVICE",
          occurredAt,
        });
        return {
          status: "RELEASED",
          reservationId: reservation.id,
          releaseTransactionId: operation.transaction.id,
          points: reservation.points.toString(),
          releasedAt: occurredAt,
        };
      });
    } catch (error) {
      return {
        status: "REJECTED",
        code: this.code(error, "IDEMPOTENCY_CONFLICT") as "IDEMPOTENCY_CONFLICT",
        message: this.message(error),
        retryable: this.retryable(error),
      };
    }
  }

  private quoteMismatch(params: ReserveCheckoutLoyaltyRedemptionParams): string | null {
    const { context, quote } = params;
    const { revision: _revision, ...base } = quote;
    if (canonicalHash(base) !== quote.revision) return "Quote revision is invalid";
    if (quote.basedOnCheckoutVersion !== context.checkoutVersion)
      return "Checkout version changed after quote";
    if (quote.basedOnPricingQuoteRevision !== context.pricingQuoteRevision)
      return "Pricing quote changed after loyalty quote";
    if (quote.basedOnCustomerEligibilityRevision !== context.customerEligibilityRevision)
      return "Customer eligibility changed after loyalty quote";
    if (quote.discount.currencyCode !== context.currencyCode)
      return "Quote currency does not match checkout";
    return null;
  }

  private programSnapshot(program: Program, version: ProgramVersion): LoyaltyProgramSnapshot {
    return {
      programId: program.id,
      programCode: program.code,
      programVersionId: version.id,
      programVersion: version.version,
      programRevision: program.revision,
      currencyCode: program.defaultCurrencyCode,
      redemptionEnabled: version.redemptionEnabled,
      redeemPoints: version.redeemPoints.toString(),
      redeemAmountMinor: version.redeemAmountMinor.toString(),
      minimumRedeemPoints: version.minimumRedeemPoints.toString(),
      maximumRedeemPointsPerOrder: version.maximumRedeemPointsPerOrder?.toString() ?? null,
      maximumOrderPercentageBps: version.maximumOrderPercentageBps,
      policyRevision: canonicalHash({
        id: version.id,
        revision: version.revision,
        rules: version.rules,
      }),
    };
  }

  private async originalLotChunks(
    reservation: Reservation,
    requested: bigint,
    restoredAt: string,
    skipped = 0n,
  ): Promise<{ points: bigint; activatedAt: string; expiresAt: string | null }[]> {
    const events = await this.repository.reservation.listEvents(reservation.id);
    const created = events.find(({ eventType }) => eventType === "CREATED");
    if (!created)
      throw new LoyaltyDomainError(
        "RESERVATION_AUDIT_MISSING",
        "Reservation creation audit is missing",
        true,
      );
    const entries = await this.repository.ledger.listEntries(created.transactionId);
    const debit = entries.find(
      ({ bucket, pointsDelta }) => bucket === "AVAILABLE" && pointsDelta < 0n,
    );
    if (!debit)
      throw new LoyaltyDomainError(
        "RESERVATION_AUDIT_MISSING",
        "Reservation lot debit is missing",
        true,
      );
    const lots = await this.repository.ledger.listPointLots(reservation.accountId);
    const allocations = await this.repository.ledger.listLotAllocations(lots.map(({ id }) => id));
    const byId = new Map(lots.map((lot) => [lot.id, lot]));
    const version = await this.repository.program.findVersionById(reservation.programVersionId);
    let remaining = requested;
    let offset = skipped;
    const result: { points: bigint; activatedAt: string; expiresAt: string | null }[] = [];
    for (const allocation of allocations.filter(({ debitEntryId }) => debitEntryId === debit.id)) {
      if (remaining === 0n) break;
      const source = byId.get(allocation.lotId);
      if (!source) continue;
      if (offset >= allocation.points) {
        offset -= allocation.points;
        continue;
      }
      const allocationRemainder = allocation.points - offset;
      offset = 0n;
      const points = allocationRemainder < remaining ? allocationRemainder : remaining;
      const resetExpiry =
        version?.restoredPointsExpiryPolicy === "RESET_FROM_RESTORE" &&
        version.pointsExpiryDays !== null;
      result.push({
        points,
        activatedAt:
          !resetExpiry && source.expiresAt && Date.parse(source.expiresAt) <= Date.parse(restoredAt)
            ? source.activatedAt
            : restoredAt,
        expiresAt: resetExpiry ? addDays(restoredAt, version.pointsExpiryDays!) : source.expiresAt,
      });
      remaining -= points;
    }
    if (remaining > 0n)
      throw new LoyaltyDomainError(
        "RESERVATION_AUDIT_MISSING",
        "Reservation allocations do not cover restored points",
        true,
      );
    return result;
  }

  private async requireAccount(id: string): Promise<Account> {
    const account = await this.repository.account.lockById(id);
    if (!account)
      throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
    return account;
  }

  private async requireReservationTransaction(reservation: Reservation): Promise<string> {
    const event = (await this.repository.reservation.listEvents(reservation.id)).find(
      ({ eventType }) => eventType === "CREATED",
    );
    if (!event)
      throw new LoyaltyDomainError(
        "RESERVATION_AUDIT_MISSING",
        "Reservation transaction audit is missing",
        true,
      );
    return event.transactionId;
  }

  private reserved(
    reservation: Reservation,
    transactionId: string,
  ): ReserveCheckoutLoyaltyRedemptionResult {
    return {
      status: "RESERVED",
      reservationId: reservation.id,
      transactionId,
      accountId: reservation.accountId,
      points: reservation.points.toString(),
      discount: {
        amountMinor: reservation.discountAmountMinor.toString(),
        currencyCode: reservation.currencyCode,
      },
      expiresAt: reservation.expiresAt,
      reservationRevision: reservation.revision,
    };
  }

  private rejected(
    code: Extract<QuoteCheckoutLoyaltyRedemptionResult, { status: "REJECTED" }>["code"],
    message: string,
    retryable: boolean,
  ): QuoteCheckoutLoyaltyRedemptionResult {
    return { status: "REJECTED", code, message, retryable };
  }

  private reserveRejected(
    code: Extract<ReserveCheckoutLoyaltyRedemptionResult, { status: "REJECTED" }>["code"],
    message: string,
    retryable: boolean,
  ): ReserveCheckoutLoyaltyRedemptionResult {
    return { status: "REJECTED", code, message, retryable };
  }

  private commitRejected(
    code: Extract<CommitCheckoutLoyaltyRedemptionResult, { status: "REJECTED" }>["code"],
    message: string,
    retryable: boolean,
  ): CommitCheckoutLoyaltyRedemptionResult {
    return { status: "REJECTED", code, message, retryable };
  }

  private reverseRejected(
    code: Extract<ReverseCheckoutLoyaltyRedemptionResult, { status: "REJECTED" }>["code"],
    message: string,
    retryable: boolean,
  ): ReverseCheckoutLoyaltyRedemptionResult {
    return { status: "REJECTED", code, message, retryable };
  }

  private requireHash(hash: string): void {
    if (!SHA256.test(hash))
      throw new LoyaltyDomainError(
        "IDEMPOTENCY_CONFLICT",
        "requestHash must be a lowercase SHA-256 hash",
      );
  }

  private code(error: unknown, fallback: string): any {
    return error instanceof LoyaltyDomainError ? error.code : fallback;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private retryable(error: unknown): boolean {
    return error instanceof LoyaltyDomainError ? error.retryable : true;
  }
}

function earliestExpiry(chunks: readonly { expiresAt: string | null }[]): string | null {
  const expiries = chunks
    .map(({ expiresAt }) => expiresAt)
    .filter((value): value is string => value !== null)
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  return expiries[0] ?? null;
}
