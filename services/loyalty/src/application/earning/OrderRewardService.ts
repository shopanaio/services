import type {
  OrderRewardEligibleEvent,
  OrderRewardReversedEvent,
} from "@shopana/events";
import type { Repository } from "../../repositories/Repository.js";
import type { Account, EventFact, LoyaltyTransaction, ProgramVersion } from "../../repositories/models/index.js";
import type {
  LoyaltyCalculationLineSnapshotV1,
  LoyaltyCalculationSnapshotV1,
  LoyaltyProgramRulesV1,
} from "../../contracts/types.js";
import { evaluateLoyaltyProgramEligibility } from "../../contracts/policy.js";
import { PointsLedgerService } from "../ledger/PointsLedgerService.js";
import { CheckoutRedemptionService } from "../checkout/CheckoutRedemptionService.js";
import { LoyaltyDomainError } from "../errors.js";
import {
  addDays,
  addSeconds,
  calculateRatio,
  canonicalHash,
  matchesCatalogSelector,
  modifierBasisPoints,
  multiplyBasisPoints,
  parsePoints,
} from "../math.js";
import { EarningRuleEngine } from "./EarningRuleEngine.js";
import { MonetaryWalletService } from "../wallet/MonetaryWalletService.js";
import { RewardEntitlementService } from "../rewards/RewardEntitlementService.js";

export interface ExternalRewardInput {
  producer: string;
  externalEventId: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  customerId: string;
  storeId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  triggerType: "SIGNUP" | "REVIEW" | "REFERRAL" | "BIRTHDAY" | "ANNIVERSARY" | "LOGIN" | "SUBSCRIPTION_RENEWAL" | "CUSTOM_EVENT";
  channelCode?: string;
  segmentIds?: readonly string[];
  currencyCode?: string;
}

export class OrderRewardService {
  private readonly points: PointsLedgerService;

  constructor(private readonly repository: Repository) {
    this.points = new PointsLedgerService(repository);
  }

  async earn(event: OrderRewardEligibleEvent): Promise<{ transactionId: string; accountId: string } | null> {
    return this.repository.runInTransaction(async () => {
      const fact = await this.appendFact(event);
      const program = await this.repository.program.findDefault();
      if (!program || program.status !== "ACTIVE" || program.defaultCurrencyCode !== event.payload.currencyCode) return null;
      const version = await this.repository.program.findEffectiveVersion(program.id, event.payload.eligibleAt);
      if (!version || !version.earningEnabled) return null;
      const rules = version.rules as unknown as LoyaltyProgramRulesV1;
      const eligibility = evaluateLoyaltyProgramEligibility(rules.eligibility, {
        channelCode: event.payload.channelCode,
        segmentIds: event.payload.segmentIds,
      });
      if (!eligibility.eligible) return null;
      const account = await this.points.ensureAccount(event.payload.customerId, program.id);
      if (account.status !== "ACTIVE") return null;
      const calculation = this.calculate(event, version, rules);
      if (parsePoints(event.payload.eligibleAmountMinor) < version.minimumEligibleAmountMinor
        || parsePoints(calculation.awardedPoints) === 0n) {
        await new EarningRuleEngine(this.repository).evaluate({
          fact,
          triggerType: "ORDER",
          program,
          version,
          account,
          context: this.ruleContext(event, 0n),
        });
        return null;
      }
      const activationAt = addSeconds(event.payload.eligibleAt, version.activationDelaySeconds);
      const operation = await this.points.award({
        account,
        programVersionId: version.id,
        source: "ORDER",
        sourceId: event.payload.orderId,
        sourceRevision: String(event.payload.orderRevision),
        idempotencyKey: `event:${event.eventId}:purchase`,
        requestHash: fact.payloadHash,
        correlationId: event.context.correlationId,
        causationId: event.context.causationId ?? null,
        eventId: event.eventId,
        actorType: "SERVICE",
        reasonCode: "ORDER_REWARD_ELIGIBLE",
        occurredAt: event.payload.eligibleAt,
        effectiveAt: activationAt,
        points: parsePoints(calculation.awardedPoints),
        activationAt,
        expiresAt: version.pointsExpiryDays === null ? null : addDays(activationAt, version.pointsExpiryDays),
        metadata: calculation as unknown as Record<string, unknown>,
      });
      await new EarningRuleEngine(this.repository).evaluate({
        fact,
        triggerType: "ORDER",
        program,
        version,
        account,
        context: this.ruleContext(event, parsePoints(calculation.awardedPoints)),
      });
      return { transactionId: operation.transaction.id, accountId: account.id };
    });
  }

  async reverse(event: OrderRewardReversedEvent): Promise<{
    earningReversalTransactionId: string | null;
    redemptionRestoreTransactionIds: readonly string[];
    debtPoints: string;
  }> {
    return this.repository.runInTransaction(async () => {
      await this.appendFact(event);
      const customerAccounts = await this.repository.account.listByCustomer(event.payload.customerId);
      let account: Account | null = null;
      let transactions: LoyaltyTransaction[] = [];
      let originals: LoyaltyTransaction[] = [];
      for (const candidate of customerAccounts) {
        const candidateTransactions = await this.repository.ledger.listAllTransactions(candidate.id);
        const candidateOriginals = candidateTransactions.filter((transaction) =>
          transaction.kind === "EARN_PENDING" && transaction.source === "ORDER"
          && transaction.sourceId === event.payload.orderId,
        );
        if (candidateOriginals.length === 0) continue;
        account = candidate;
        transactions = candidateTransactions;
        originals = candidateOriginals;
        break;
      }
      if (!account) {
        const reservations = await this.repository.reservation.findByOrder(event.payload.orderId);
        for (const reservation of reservations) {
          const candidate = customerAccounts.find(({ id }) => id === reservation.accountId);
          if (candidate) {
            account = candidate;
            break;
          }
        }
        const facts = await this.repository.event.listOrderEligibilityFacts(
          event.payload.customerId,
          event.payload.orderId,
        );
        if (!account) {
          for (const candidate of customerAccounts) {
            const hasEvaluations = (await Promise.all(
              facts.map((fact) => this.repository.event.listEvaluations(fact.id, candidate.id)),
            )).some((evaluations) => evaluations.length > 0);
            if (hasEvaluations) {
              account = candidate;
              break;
            }
          }
        }
        if (!account) {
          const program = await this.repository.program.findDefault();
          account = program
            ? await this.repository.account.findByCustomerAndProgram(event.payload.customerId, program.id)
            : null;
        }
        if (account) transactions = await this.repository.ledger.listAllTransactions(account.id);
      }
      if (!account) return { earningReversalTransactionId: null, redemptionRestoreTransactionIds: [], debtPoints: "0" };
      let reversal: LoyaltyTransaction | null = null;
      let debt = 0n;
      const allocation = await this.refundAllocations(event.payload.customerId, event.payload.orderId);
      for (const original of originals) {
        const version = original.programVersionId
          ? await this.repository.program.findVersionById(original.programVersionId)
          : null;
        if (version) {
          const originalEligible = BigInt(String(original.metadata.eligibleAmountMinor ?? "0"));
          const originalAward = BigInt(String(original.metadata.awardedPoints ?? "0"));
          const orderRevision = String(original.metadata.orderRevision ?? original.sourceRevision ?? "");
          const allocatedEligible = allocation.byOrderRevision.get(orderRevision) ?? 0n;
          const prior = transactions
            .filter((item) => item.kind === "REVERSE_EARN" && item.metadata.originalTransactionId === original.id)
            .reduce((sum, item) => sum + BigInt(String(item.metadata.points ?? "0")), 0n);
          const calculated = version.refundPolicy === "FULL_REVERSAL"
            ? allocation.allocatedTotal > 0n ? originalAward : 0n
            : originalEligible === 0n
              ? 0n
              : (originalAward * allocatedEligible) / originalEligible;
          const target = calculated > originalAward ? originalAward : calculated;
          const points = target > prior ? target - prior : 0n;
          if (points > 0n) {
            const result = await this.reversePoints(account, version, original, event, points, `purchase:${original.id}`);
            reversal ??= result.transaction;
            debt += result.debt;
          }
        }
      }
      const evaluated = await this.reverseEvaluatedAwards(account, event);
      reversal ??= evaluated.transactions[0] ?? null;
      debt += evaluated.debt;
      const restored = await this.reverseRedemptions(account, event);
      return {
        earningReversalTransactionId: reversal?.id ?? null,
        redemptionRestoreTransactionIds: restored,
        debtPoints: debt.toString(),
      };
    });
  }

  async ingestExternal(input: ExternalRewardInput): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const hash = canonicalHash(input.payload);
      const existing = await this.repository.event.findFactByExternalId(input.producer, input.externalEventId);
      if (existing && existing.payloadHash !== hash) throw new LoyaltyDomainError("EVENT_IDEMPOTENCY_CONFLICT", "External event identity was reused with another payload");
      const fact = existing ?? await this.repository.event.appendFact({
        producer: input.producer,
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        customerId: input.customerId,
        occurredAt: input.occurredAt,
        payloadSchemaVersion: 1,
        payloadHash: hash,
        payload: input.payload,
      });
      const program = await this.repository.program.findDefault();
      if (!program) return;
      const version = await this.repository.program.findEffectiveVersion(program.id, input.occurredAt);
      if (!version || !version.earningEnabled) return;
      const rules = version.rules as unknown as LoyaltyProgramRulesV1;
      const eligibility = evaluateLoyaltyProgramEligibility(rules.eligibility, {
        channelCode: input.channelCode ?? "",
        segmentIds: input.segmentIds ?? [],
      });
      if (!eligibility.eligible) return;
      const triggerRules = (await this.repository.earningRule.listForVersion(version.id))
        .filter(({ triggerType }) => triggerType === input.triggerType);
      if (triggerRules.length === 0) return;
      const account = await this.points.ensureAccount(input.customerId, program.id);
      if (account.status !== "ACTIVE") return;
      await new EarningRuleEngine(this.repository).evaluate({
        fact,
        triggerType: input.triggerType,
        program,
        version,
        account,
        context: {
          channelCode: input.channelCode,
          segmentIds: input.segmentIds ?? [],
          currencyCode: input.currencyCode,
          eligibleAmountMinor: input.payload.eligibleAmountMinor === undefined
            ? undefined
            : BigInt(String(input.payload.eligibleAmountMinor)),
          firstPurchase: input.payload.firstPurchase === true,
        },
      });
    });
  }

  private calculate(
    event: OrderRewardEligibleEvent,
    version: ProgramVersion,
    rules: LoyaltyProgramRulesV1,
  ): LoyaltyCalculationSnapshotV1 {
    const lines: LoyaltyCalculationLineSnapshotV1[] = [];
    for (const line of event.payload.lines) {
      if (rules.earning.excludedSelectors.some((selector) => matchesCatalogSelector(selector, line))) continue;
      const amount = parsePoints(line.eligibleAmountMinor);
      const base = calculateRatio(amount, version.earnPoints, version.earnAmountMinor, version.roundingMode);
      const modifier = modifierBasisPoints(rules.earning.modifiers, rules.earning.modifierStackingMode, line, event.payload.segmentIds, event.payload.eligibleAt);
      const awarded = multiplyBasisPoints(base, modifier.basisPoints, version.roundingMode);
      lines.push({
        orderLineId: line.orderLineId,
        eligibleAmountMinor: line.eligibleAmountMinor,
        basePoints: base.toString(),
        modifierIds: modifier.modifierIds,
        multiplierBps: modifier.basisPoints,
        roundingMode: version.roundingMode,
        awardedPoints: awarded.toString(),
      });
    }
    const basePoints = lines.reduce((sum, line) => sum + BigInt(line.basePoints), 0n);
    const awardedPoints = lines.reduce((sum, line) => sum + BigInt(line.awardedPoints), 0n);
    return {
      schemaVersion: 1,
      programVersionId: version.id,
      orderId: event.payload.orderId,
      orderRevision: event.payload.orderRevision,
      currencyCode: event.payload.currencyCode,
      channelCode: event.payload.channelCode,
      pricingQuoteId: event.payload.pricingQuoteId,
      pricingQuoteRevision: event.payload.pricingQuoteRevision,
      customerEligibilityRevision: event.payload.customerEligibilityRevision,
      segmentIds: event.payload.segmentIds,
      segmentMembershipRevision: event.payload.segmentMembershipRevision,
      eligibleAmountMinor: event.payload.eligibleAmountMinor,
      basePoints: basePoints.toString(),
      roundingMode: version.roundingMode,
      awardedPoints: awardedPoints.toString(),
      lines,
    };
  }

  private async appendFact(event: OrderRewardEligibleEvent | OrderRewardReversedEvent): Promise<EventFact> {
    const hash = canonicalHash(event.payload);
    const existing = await this.repository.event.findFactByExternalId(event.source, event.eventId);
    if (existing) {
      if (existing.payloadHash !== hash) throw new LoyaltyDomainError("EVENT_IDEMPOTENCY_CONFLICT", "Event ID was reused with another payload");
      return existing;
    }
    return this.repository.event.appendFact({
      producer: event.source,
      externalEventId: event.eventId,
      eventType: event.eventType,
      subjectType: event.subject.type,
      subjectId: event.subject.id,
      customerId: event.payload.customerId,
      occurredAt: event.eventType === "orderRewardEligible" ? event.payload.eligibleAt : event.payload.reversedAt,
      payloadSchemaVersion: event.payload.schemaVersion,
      payloadHash: hash,
      payload: event.payload as unknown as Record<string, unknown>,
    });
  }

  private ruleContext(event: OrderRewardEligibleEvent, basePoints: bigint) {
    return {
      channelCode: event.payload.channelCode,
      segmentIds: event.payload.segmentIds,
      currencyCode: event.payload.currencyCode,
      eligibleAmountMinor: parsePoints(event.payload.eligibleAmountMinor),
      basePoints,
      firstPurchase: false,
    };
  }

  private async reversePoints(
    account: Account,
    version: ProgramVersion,
    original: LoyaltyTransaction,
    event: OrderRewardReversedEvent,
    points: bigint,
    operationKey: string,
  ): Promise<{ transaction: LoyaltyTransaction; debt: bigint }> {
    const originalEntries = await this.repository.ledger.listEntries(original.id);
    const originalRecovered = originalEntries
      .filter(({ bucket, pointsDelta }) => bucket === "DEBT" && pointsDelta < 0n)
      .reduce((sum, { pointsDelta }) => sum - pointsDelta, 0n);
    const originalCredited = originalEntries
      .filter(({ bucket, pointsDelta }) =>
        (bucket === "PENDING" || bucket === "AVAILABLE") && pointsDelta > 0n,
      )
      .reduce((sum, { pointsDelta }) => sum + pointsDelta, 0n);
    const originalPoints = originalRecovered + originalCredited;
    const previouslyReversed = (await this.repository.ledger.listAllTransactions(account.id))
      .filter((transaction) => transaction.kind === "REVERSE_EARN"
        && transaction.metadata.originalTransactionId === original.id)
      .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.points ?? "0")), 0n);
    if (points <= 0n || previouslyReversed + points > originalPoints) {
      throw new LoyaltyDomainError(
        "REVERSAL_EXCEEDS_EARNING",
        "Points reversal exceeds the original earning",
      );
    }
    const recoveredBefore = previouslyReversed < originalRecovered
      ? previouslyReversed
      : originalRecovered;
    const recoveredAfter = previouslyReversed + points < originalRecovered
      ? previouslyReversed + points
      : originalRecovered;
    const recoveredDebt = recoveredAfter - recoveredBefore;
    const creditedToReverse = points - recoveredDebt;
    const balance = await this.repository.balance.lockByAccountId(account.id);
    if (!balance) throw new LoyaltyDomainError("BALANCE_NOT_FOUND", "Loyalty balance was not found");
    const pending = balance.pendingPoints < creditedToReverse ? balance.pendingPoints : creditedToReverse;
    const afterPending = creditedToReverse - pending;
    const available = balance.availablePoints < afterPending ? balance.availablePoints : afterPending;
    const shortage = afterPending - available;
    const debtPoints = recoveredDebt + shortage;
    if (debtPoints > 0n && version.debtPolicy === "REJECT_REVERSAL") {
      throw new LoyaltyDomainError("REVERSAL_WOULD_CREATE_DEBT", "Earning reversal exceeds the available balance");
    }
    const base = {
      account,
      programVersionId: version.id,
      kind: "REVERSE_EARN" as const,
      source: "REFUND" as const,
      sourceId: event.payload.sourceId,
      sourceRevision: `${event.payload.sourceRevision}:${operationKey}`,
      idempotencyKey: `event:${event.eventId}:earning-reversal:${operationKey}`,
      requestHash: canonicalHash(event.payload),
      eventId: event.eventId,
      actorType: "SERVICE" as const,
      reasonCode: event.payload.sourceType,
      occurredAt: event.payload.reversedAt,
      effectiveAt: event.payload.reversedAt,
      metadata: {
        originalTransactionId: original.id,
        points: points.toString(),
        recoveredDebtPoints: recoveredDebt.toString(),
        debtPoints: debtPoints.toString(),
        orderId: event.payload.orderId,
      },
      entries: [
        ...(pending > 0n ? [{ bucket: "PENDING" as const, pointsDelta: -pending }] : []),
        ...(available > 0n ? [{ bucket: "AVAILABLE" as const, pointsDelta: -available }] : []),
        ...(debtPoints > 0n ? [{ bucket: "DEBT" as const, pointsDelta: debtPoints }] : []),
      ],
    };
    const operation = pending > 0n || available > 0n
      ? await this.points.moveWithLotAllocations({
          ...base,
          lotDebits: [
            ...(pending > 0n ? [{ bucket: "PENDING" as const, points: pending, allocationType: "REVERSE" as const }] : []),
            ...(available > 0n ? [{ bucket: "AVAILABLE" as const, points: available, allocationType: "REVERSE" as const }] : []),
          ],
        })
      : await this.points.append(base);
    return { transaction: operation.transaction, debt: debtPoints };
  }

  private async reverseEvaluatedAwards(
    account: Account,
    event: OrderRewardReversedEvent,
  ): Promise<{ transactions: LoyaltyTransaction[]; debt: bigint }> {
    const allocation = await this.refundAllocations(
      event.payload.customerId,
      event.payload.orderId,
    );
    const reversals: LoyaltyTransaction[] = [];
    let debt = 0n;
    for (const fact of allocation.facts) {
      const originalEligible = parsePoints(String(fact.payload.eligibleAmountMinor ?? "0"));
      if (originalEligible <= 0n) continue;
      const orderRevision = String(fact.payload.orderRevision ?? "");
      const allocatedEligible = allocation.byOrderRevision.get(orderRevision) ?? 0n;
      const evaluations = await this.repository.event.listEvaluations(fact.id, account.id);
      for (const evaluation of evaluations) {
        if (evaluation.transactionId && evaluation.pointsAwarded && evaluation.pointsAwarded > 0n) {
          const original = await this.repository.ledger.findTransactionById(evaluation.transactionId);
          if (original?.programVersionId) {
            const version = await this.repository.program.findVersionById(original.programVersionId);
            if (version) {
              const prior = (await this.repository.ledger.listAllTransactions(account.id))
                .filter((transaction) => transaction.kind === "REVERSE_EARN"
                  && transaction.metadata.originalTransactionId === original.id)
                .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.points ?? "0")), 0n);
              const target = version.refundPolicy === "FULL_REVERSAL"
                ? (allocation.allocatedTotal > 0n ? evaluation.pointsAwarded : 0n)
                : (evaluation.pointsAwarded * allocatedEligible) / originalEligible;
              const points = target > prior ? target - prior : 0n;
              if (points > 0n) {
                const reversed = await this.reversePoints(
                  account,
                  version,
                  original,
                  event,
                  points,
                  `rule:${evaluation.id}`,
                );
                reversals.push(reversed.transaction);
                debt += reversed.debt;
              }
            }
          }
        }
        if (evaluation.monetaryAmountMinor && evaluation.monetaryAmountMinor > 0n) {
          const transactionId = typeof evaluation.result.monetaryTransactionId === "string"
            ? evaluation.result.monetaryTransactionId
            : null;
          const walletId = typeof evaluation.result.walletId === "string"
            ? evaluation.result.walletId
            : null;
          if (transactionId && walletId) {
            const [wallet, original] = await Promise.all([
              this.repository.wallet.findById(walletId),
              this.repository.wallet.findTransactionById(transactionId),
            ]);
            if (wallet && original?.programVersionId) {
              const version = await this.repository.program.findVersionById(original.programVersionId);
              if (version) {
                const prior = (await this.repository.wallet.listAllTransactions(wallet.id))
                  .filter((transaction) => transaction.kind === "REVERSE_EARN"
                    && transaction.metadata.originalTransactionId === original.id)
                  .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.amountMinor ?? "0")), 0n);
                const target = version.refundPolicy === "FULL_REVERSAL"
                  ? (allocation.allocatedTotal > 0n ? evaluation.monetaryAmountMinor : 0n)
                  : (evaluation.monetaryAmountMinor * allocatedEligible) / originalEligible;
                const amountMinor = target > prior ? target - prior : 0n;
                if (amountMinor > 0n) {
                  await new MonetaryWalletService(this.repository).reverseCredit({
                    wallet,
                    programVersionId: version.id,
                    originalTransactionId: original.id,
                    amountMinor,
                    debtPolicy: version.debtPolicy,
                    sourceType: "REFUND",
                    sourceId: event.payload.sourceId,
                    sourceRevision: `${event.payload.sourceRevision}:rule:${evaluation.id}`,
                    idempotencyKey: `event:${event.eventId}:monetary-reversal:${evaluation.id}`,
                    requestHash: canonicalHash({ eventId: event.eventId, evaluationId: evaluation.id, amountMinor: amountMinor.toString() }),
                    actorType: "SERVICE",
                    reasonCode: event.payload.sourceType,
                    occurredAt: event.payload.reversedAt,
                    effectiveAt: event.payload.reversedAt,
                  });
                }
              }
            }
          }
        }
        if (typeof evaluation.result.entitlementId === "string") {
          const entitlement = await this.repository.reward.findEntitlementById(evaluation.result.entitlementId);
          const definition = entitlement
            ? await this.repository.reward.findDefinitionById(entitlement.rewardDefinitionId)
            : null;
          const version = definition
            ? await this.repository.program.findVersionById(definition.programVersionId)
            : null;
          const shouldRevoke = allocatedEligible === originalEligible
            || allocation.allocatedTotal === allocation.totalEligible
            || (version?.refundPolicy === "FULL_REVERSAL" && allocation.allocatedTotal > 0n);
          if (shouldRevoke && entitlement
            && (entitlement.status === "ISSUED" || entitlement.status === "RESERVED")) {
            await new RewardEntitlementService(this.repository).transition({
              entitlementId: entitlement.id,
              transition: { type: "REVOKE" },
              idempotencyKey: `event:${event.eventId}:reward-reversal:${evaluation.id}`,
              occurredAt: event.payload.reversedAt,
              actorType: "SERVICE",
              reasonCode: event.payload.sourceType,
            });
          }
        }
      }
    }
    return { transactions: reversals, debt };
  }

  private async reverseRedemptions(
    account: Account,
    event: OrderRewardReversedEvent,
  ): Promise<string[]> {
    const reservations = await this.repository.reservation.findByOrder(event.payload.orderId);
    if (reservations.length === 0) return [];
    const allocation = await this.refundAllocations(
      event.payload.customerId,
      event.payload.orderId,
    );
    const originalEligible = allocation.totalEligible;
    if (originalEligible === 0n) return [];
    const cappedReversed = allocation.allocatedTotal;
    const transactions = await this.repository.ledger.listAllTransactions(account.id);
    const restored: string[] = [];
    for (const reservation of reservations) {
      const target = (reservation.points * cappedReversed) / originalEligible;
      const alreadyRestored = transactions
        .filter((transaction) => transaction.kind === "RESTORE_REDEEM"
          && transaction.metadata.reservationId === reservation.id)
        .reduce((sum, transaction) => sum + BigInt(String(transaction.metadata.points ?? "0")), 0n);
      const points = target > alreadyRestored ? target - alreadyRestored : 0n;
      if (points === 0n) continue;
      const idempotencyKey = `event:${event.eventId}:redemption:${reservation.id}`;
      const result = await new CheckoutRedemptionService(this.repository).reverse({
        storeId: reservation.storeId,
        reservationId: reservation.id,
        orderId: event.payload.orderId,
        orderRevision: event.payload.orderRevision,
        refundId: event.payload.sourceId,
        refundRevision: event.payload.sourceRevision,
        points: points.toString(),
        occurredAt: event.payload.reversedAt,
        idempotencyKey,
        requestHash: canonicalHash({ eventId: event.eventId, reservationId: reservation.id, points: points.toString() }),
      });
      if (result.status === "REVERSED") restored.push(result.restoreTransactionId);
    }
    return restored;
  }

  private async cumulativeReversedAmount(customerId: string, orderId: string): Promise<bigint> {
    const facts = await this.repository.event.listAllFactsForCustomer(customerId);
    return facts
      .filter((fact) => fact.eventType === "orderRewardReversed" && fact.payload.orderId === orderId)
      .reduce((sum, fact) => {
        const value = String(fact.payload.eligibleAmountMinor ?? "0");
        return /^(0|[1-9][0-9]*)$/.test(value) ? sum + BigInt(value) : sum;
      }, 0n);
  }

  private async refundAllocations(customerId: string, orderId: string): Promise<{
    facts: EventFact[];
    byOrderRevision: Map<string, bigint>;
    totalEligible: bigint;
    allocatedTotal: bigint;
  }> {
    const facts = await this.repository.event.listOrderEligibilityFacts(customerId, orderId);
    const totalEligible = facts.reduce(
      (sum, fact) => sum + parsePoints(String(fact.payload.eligibleAmountMinor ?? "0")),
      0n,
    );
    const cumulative = await this.cumulativeReversedAmount(customerId, orderId);
    const allocatedTotal = cumulative < totalEligible ? cumulative : totalEligible;
    const byOrderRevision = new Map<string, bigint>();
    let remaining = allocatedTotal;
    for (const fact of facts) {
      const eligible = parsePoints(String(fact.payload.eligibleAmountMinor ?? "0"));
      const allocated = eligible < remaining ? eligible : remaining;
      const revision = String(fact.payload.orderRevision ?? "");
      byOrderRevision.set(revision, (byOrderRevision.get(revision) ?? 0n) + allocated);
      remaining -= allocated;
      if (remaining === 0n) break;
    }
    return { facts, byOrderRevision, totalEligible, allocatedTotal };
  }
}
