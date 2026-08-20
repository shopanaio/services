import type { Repository } from "../../repositories/Repository.js";
import type {
  Account,
  EarningRule,
  EarningRuleUsage,
  EventFact,
  Program,
  ProgramVersion,
} from "../../repositories/models/index.js";
import type {
  LoyaltyConditionExpressionV1,
  LoyaltyEarningActionV1,
  LoyaltyEarningLimitsV1,
} from "../../contracts/types.js";
import { LoyaltyDomainError } from "../errors.js";
import {
  addDays,
  addSeconds,
  calculateRatio,
  evaluateCondition,
  multiplyBasisPoints,
  parsePoints,
} from "../math.js";
import { PointsLedgerService } from "../ledger/PointsLedgerService.js";
import { RewardEntitlementService } from "../rewards/RewardEntitlementService.js";
import { MonetaryWalletService } from "../wallet/MonetaryWalletService.js";

export interface EarningEvaluationContext {
  channelCode?: string;
  segmentIds: readonly string[];
  paymentMethodCode?: string;
  firstPurchase?: boolean;
  currencyCode?: string;
  eligibleAmountMinor?: bigint;
  basePoints?: bigint;
}

export class EarningRuleEngine {
  constructor(private readonly repository: Repository) {}

  async evaluate(input: {
    fact: EventFact;
    triggerType: EarningRule["triggerType"];
    program: Program;
    version: ProgramVersion;
    account: Account;
    context: EarningEvaluationContext;
  }): Promise<void> {
    const account = await this.repository.account.lockById(input.account.id);
    if (!account || account.status !== "ACTIVE") {
      throw new LoyaltyDomainError("ACCOUNT_NOT_ACTIVE", "Loyalty account is not active");
    }
    const rules = (await this.repository.earningRule.listForVersion(input.version.id)).filter(
      ({ triggerType }) => triggerType === input.triggerType,
    );
    for (const rule of rules) {
      const existing = await this.repository.event.findEvaluation(
        input.fact.id,
        rule.id,
        input.account.id,
      );
      if (existing) continue;
      if (!this.matchesTriggerConfig(rule, input.fact)) {
        await this.decision(input, rule, "IGNORED", "TRIGGER_CONFIG_NOT_MATCHED");
        continue;
      }
      const matched = this.matches(rule, input.fact, input.context);
      if (!matched) {
        await this.decision(input, rule, "INELIGIBLE", "CONDITIONS_NOT_MATCHED");
        continue;
      }
      const limits = rule.limits as unknown as LoyaltyEarningLimitsV1;
      if (!this.withinSchedule(limits, input.fact.occurredAt)) {
        await this.decision(input, rule, "INELIGIBLE", "RULE_OUTSIDE_SCHEDULE");
        continue;
      }
      const award = this.calculateAward(rule, input.version, input.context);
      const limited =
        limits.perEventMaxPoints === null
          ? award.points
          : award.points < parsePoints(limits.perEventMaxPoints)
            ? award.points
            : parsePoints(limits.perEventMaxPoints);
      const usages = await this.lockUsages(rule, limits, input.account.id, input.fact.occurredAt);
      const limitFailure = this.limitFailure(
        usages,
        limits,
        limited,
        award.monetaryAmountMinor,
        award.currencyCode,
      );
      if (limitFailure) {
        await this.decision(
          input,
          rule,
          limitFailure === "CAMPAIGN" ? "BUDGET_EXHAUSTED" : "LIMIT_REACHED",
          `${limitFailure}_LIMIT_REACHED`,
        );
        continue;
      }
      const result = await this.executeAction({
        ...input,
        rule,
        award: { ...award, points: limited },
      });
      await this.incrementUsages(usages, limited, award.monetaryAmountMinor, award.currencyCode);
      await this.repository.event.appendEvaluation({
        eventFactId: input.fact.id,
        earningRuleId: rule.id,
        accountId: input.account.id,
        decision: "AWARDED",
        reasonCode: "RULE_AWARDED",
        pointsAwarded: limited > 0n ? limited : null,
        monetaryAmountMinor: award.monetaryAmountMinor > 0n ? award.monetaryAmountMinor : null,
        currencyCode: award.monetaryAmountMinor > 0n ? award.currencyCode : null,
        transactionId: result.transactionId,
        result: result.result,
      });
      if (rule.stopProcessing) break;
    }
  }

  private matches(rule: EarningRule, fact: EventFact, context: EarningEvaluationContext): boolean {
    const expression = rule.conditions as unknown as LoyaltyConditionExpressionV1;
    const lines = Array.isArray(fact.payload.lines) ? fact.payload.lines : [];
    const base = {
      channelCode: context.channelCode,
      segmentIds: context.segmentIds,
      paymentMethodCode: context.paymentMethodCode,
      firstPurchase: context.firstPurchase,
      occurredAt: fact.occurredAt,
      event: fact.payload,
    };
    if (lines.length === 0) return evaluateCondition(expression, base);
    return lines.some((line) =>
      evaluateCondition(expression, {
        ...base,
        catalog: catalogLine(line),
      }),
    );
  }

  private matchesTriggerConfig(rule: EarningRule, fact: EventFact): boolean {
    const config = rule.triggerConfig;
    const eventType = typeof config.eventType === "string" ? config.eventType : null;
    if (eventType && eventType !== fact.eventType) return false;
    const eventTypes = stringArray(config.eventTypes);
    if (eventTypes.length > 0 && !eventTypes.includes(fact.eventType)) return false;
    const producer = typeof config.producer === "string" ? config.producer : null;
    if (producer && producer !== fact.producer) return false;
    const subjectType = typeof config.subjectType === "string" ? config.subjectType : null;
    return subjectType === null || subjectType === fact.subjectType;
  }

  private calculateAward(
    rule: EarningRule,
    version: ProgramVersion,
    context: EarningEvaluationContext,
  ) {
    const action = rule.action as unknown as LoyaltyEarningActionV1;
    if (action.type === "AWARD_FIXED_POINTS") {
      return {
        points: parsePoints(action.points),
        monetaryAmountMinor: 0n,
        currencyCode: null as string | null,
      };
    }
    if (action.type === "AWARD_SPEND_RATIO") {
      const amount = context.eligibleAmountMinor ?? 0n;
      return {
        points: calculateRatio(
          amount,
          parsePoints(action.points),
          parsePoints(action.amountMinor),
          version.roundingMode,
        ),
        monetaryAmountMinor: 0n,
        currencyCode: null as string | null,
      };
    }
    if (action.type === "APPLY_MULTIPLIER") {
      const base = context.basePoints ?? 0n;
      const multiplied = multiplyBasisPoints(base, action.multiplierBps, version.roundingMode);
      return {
        points: multiplied > base ? multiplied - base : 0n,
        monetaryAmountMinor: 0n,
        currencyCode: null as string | null,
      };
    }
    if (action.type === "AWARD_CASHBACK") {
      const amount = multiplyBasisPoints(
        context.eligibleAmountMinor ?? 0n,
        action.basisPoints,
        "DOWN",
      );
      if (action.settlement === "MONETARY") {
        return {
          points: 0n,
          monetaryAmountMinor: amount,
          currencyCode: action.currencyCode ?? context.currencyCode ?? null,
        };
      }
      return {
        points: calculateRatio(
          amount,
          version.earnPoints,
          version.earnAmountMinor,
          version.roundingMode,
        ),
        monetaryAmountMinor: 0n,
        currencyCode: null as string | null,
      };
    }
    return { points: 0n, monetaryAmountMinor: 0n, currencyCode: null as string | null };
  }

  private async executeAction(input: {
    fact: EventFact;
    program: Program;
    version: ProgramVersion;
    account: Account;
    rule: EarningRule;
    context: EarningEvaluationContext;
    award: { points: bigint; monetaryAmountMinor: bigint; currencyCode: string | null };
  }): Promise<{ transactionId: string | null; result: Record<string, unknown> }> {
    const action = input.rule.action as unknown as LoyaltyEarningActionV1;
    if (action.type === "ISSUE_REWARD") {
      const entitlement = await new RewardEntitlementService(this.repository).issue({
        account: input.account,
        programVersionId: input.version.id,
        definitionCode: action.rewardDefinitionCode,
        idempotencyKey: `event:${input.fact.id}:rule:${input.rule.id}`,
        occurredAt: input.fact.occurredAt,
        actorType: "SYSTEM",
        sourceEventFactId: input.fact.id,
      });
      return { transactionId: null, result: { entitlementId: entitlement.id } };
    }
    if (input.award.monetaryAmountMinor > 0n) {
      if (!input.award.currencyCode)
        throw new LoyaltyDomainError("CURRENCY_REQUIRED", "Monetary cashback requires a currency");
      const walletService = new MonetaryWalletService(this.repository);
      const wallet = await walletService.ensureWallet(
        input.account,
        "CASHBACK",
        input.award.currencyCode,
      );
      const transaction = await walletService.credit({
        wallet,
        programVersionId: input.version.id,
        kind: "EARN_PENDING",
        sourceType: "LOYALTY_EVENT",
        sourceId: input.fact.id,
        sourceRevision: input.rule.id,
        idempotencyKey: `event:${input.fact.id}:rule:${input.rule.id}`,
        requestHash: input.fact.payloadHash,
        actorType: "SYSTEM",
        reasonCode: `EARNING_RULE_${input.rule.code}`,
        occurredAt: input.fact.occurredAt,
        effectiveAt: addSeconds(input.fact.occurredAt, input.version.activationDelaySeconds),
        amountMinor: input.award.monetaryAmountMinor,
        activationAt: addSeconds(input.fact.occurredAt, input.version.activationDelaySeconds),
        expiresAt:
          input.version.pointsExpiryDays === null
            ? null
            : addDays(
                addSeconds(input.fact.occurredAt, input.version.activationDelaySeconds),
                input.version.pointsExpiryDays,
              ),
        metadata: { eventFactId: input.fact.id, earningRuleId: input.rule.id },
      });
      return {
        transactionId: null,
        result: { monetaryTransactionId: transaction.transaction.id, walletId: wallet.id },
      };
    }
    if (input.award.points <= 0n) return { transactionId: null, result: { awardedPoints: "0" } };
    const activationAt = addSeconds(input.fact.occurredAt, input.version.activationDelaySeconds);
    const operation = await new PointsLedgerService(this.repository).award({
      account: input.account,
      programVersionId: input.version.id,
      source: "SYSTEM",
      sourceId: input.fact.id,
      sourceRevision: input.rule.id,
      idempotencyKey: `event:${input.fact.id}:rule:${input.rule.id}`,
      requestHash: input.fact.payloadHash,
      eventId: input.fact.externalEventId,
      actorType: "SYSTEM",
      reasonCode: `EARNING_RULE_${input.rule.code}`,
      occurredAt: input.fact.occurredAt,
      effectiveAt: activationAt,
      points: input.award.points,
      activationAt,
      expiresAt:
        input.version.pointsExpiryDays === null
          ? null
          : addDays(activationAt, input.version.pointsExpiryDays),
      metadata: { eventFactId: input.fact.id, earningRuleId: input.rule.id },
    });
    return {
      transactionId: operation.transaction.id,
      result: { lotId: operation.lot?.id ?? null },
    };
  }

  private withinSchedule(limits: LoyaltyEarningLimitsV1, at: string): boolean {
    const time = Date.parse(at);
    return (
      (limits.startsAt === null || Date.parse(limits.startsAt) <= time) &&
      (limits.endsAt === null || time < Date.parse(limits.endsAt))
    );
  }

  private async lockUsages(
    rule: EarningRule,
    limits: LoyaltyEarningLimitsV1,
    accountId: string,
    at: string,
  ) {
    const usages = [];
    if (limits.perAccount)
      usages.push(
        await this.lockUsage(rule.id, `account:${accountId}`, limits.perAccount.window, at),
      );
    if (limits.campaign)
      usages.push(
        await this.lockUsage(
          rule.id,
          "campaign",
          { type: "LIFETIME", rollingWindowSeconds: null },
          at,
        ),
      );
    return usages;
  }

  private async lockUsage(
    ruleId: string,
    scopeKey: string,
    window: {
      type: "LIFETIME" | "DAY" | "WEEK" | "MONTH" | "ROLLING";
      rollingWindowSeconds: number | null;
    },
    at: string,
  ): Promise<EarningRuleUsage> {
    const bounds = this.windowBounds(window, at);
    const storageWindowStart = window.type === "ROLLING" ? new Date(0).toISOString() : bounds.start;
    const usage = await this.repository.event.lockOrCreateUsage({
      earningRuleId: ruleId,
      scopeKey,
      windowStartedAt: storageWindowStart,
      windowEndedAt: window.type === "ROLLING" ? null : bounds.end,
    });
    if (window.type !== "ROLLING") return usage;
    const accountId = scopeKey.startsWith("account:") ? scopeKey.slice("account:".length) : null;
    if (!accountId || !bounds.end) return usage;
    const summary = await this.repository.event.summarizeAwards({
      earningRuleId: ruleId,
      accountId,
      startsAt: bounds.start,
      endsAt: bounds.end,
    });
    return { ...usage, ...summary };
  }

  private windowBounds(window: { type: string; rollingWindowSeconds: number | null }, at: string) {
    const date = new Date(at);
    if (window.type === "LIFETIME") return { start: new Date(0).toISOString(), end: null };
    if (window.type === "DAY") {
      const start = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
      return {
        start: start.toISOString(),
        end: new Date(start.getTime() + 86_400_000).toISOString(),
      };
    }
    if (window.type === "WEEK") {
      const day = (date.getUTCDay() + 6) % 7;
      const start = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day),
      );
      return {
        start: start.toISOString(),
        end: new Date(start.getTime() + 7 * 86_400_000).toISOString(),
      };
    }
    if (window.type === "MONTH") {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      return {
        start: start.toISOString(),
        end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString(),
      };
    }
    const seconds = window.rollingWindowSeconds ?? 1;
    return {
      start: new Date(date.getTime() - seconds * 1_000).toISOString(),
      end: date.toISOString(),
    };
  }

  private limitFailure(
    usages: readonly EarningRuleUsage[],
    limits: LoyaltyEarningLimitsV1,
    points: bigint,
    money: bigint,
    currency: string | null,
  ): "ACCOUNT" | "CAMPAIGN" | null {
    const account = usages.find(({ scopeKey }) => scopeKey.startsWith("account:"));
    if (account && limits.perAccount) {
      if (
        limits.perAccount.maxOccurrences !== null &&
        account.occurrenceCount + 1n > parsePoints(limits.perAccount.maxOccurrences)
      )
        return "ACCOUNT";
      if (
        limits.perAccount.maxPoints !== null &&
        account.pointsAwarded + points > parsePoints(limits.perAccount.maxPoints)
      )
        return "ACCOUNT";
    }
    const campaign = usages.find(({ scopeKey }) => scopeKey === "campaign");
    if (campaign && limits.campaign) {
      if (
        limits.campaign.maxOccurrences !== null &&
        campaign.occurrenceCount + 1n > parsePoints(limits.campaign.maxOccurrences)
      )
        return "CAMPAIGN";
      if (
        limits.campaign.maxPoints !== null &&
        campaign.pointsAwarded + points > parsePoints(limits.campaign.maxPoints)
      )
        return "CAMPAIGN";
      if (currency && limits.campaign.maxMonetaryMinorByCurrency[currency]) {
        const used = BigInt(campaign.monetaryAmounts[currency] ?? "0");
        if (used + money > parsePoints(limits.campaign.maxMonetaryMinorByCurrency[currency]!))
          return "CAMPAIGN";
      }
    }
    return null;
  }

  private async incrementUsages(
    usages: readonly EarningRuleUsage[],
    points: bigint,
    money: bigint,
    currency: string | null,
  ): Promise<void> {
    for (const usage of usages) {
      const monetaryAmounts = { ...usage.monetaryAmounts };
      if (currency && money > 0n)
        monetaryAmounts[currency] = (BigInt(monetaryAmounts[currency] ?? "0") + money).toString();
      const updated = await this.repository.event.updateUsage(usage.id, usage.revision, {
        occurrenceCount: usage.occurrenceCount + 1n,
        pointsAwarded: usage.pointsAwarded + points,
        monetaryAmounts,
      });
      if (!updated)
        throw new LoyaltyDomainError(
          "EARNING_LIMIT_CONCURRENT_CHANGE",
          "Earning rule limit changed concurrently",
          true,
        );
    }
  }

  private async decision(
    input: { fact: EventFact; account: Account },
    rule: EarningRule,
    decision: "INELIGIBLE" | "LIMIT_REACHED" | "BUDGET_EXHAUSTED" | "IGNORED",
    reasonCode: string,
  ): Promise<void> {
    await this.repository.event.appendEvaluation({
      eventFactId: input.fact.id,
      earningRuleId: rule.id,
      accountId: input.account.id,
      decision,
      reasonCode,
    });
  }
}

function catalogLine(value: unknown):
  | {
      productId?: string;
      variantId?: string;
      categoryIds?: readonly string[];
      tagIds?: readonly string[];
      featureIds?: readonly string[];
      optionValueIds?: readonly string[];
    }
  | undefined {
  if (!value || typeof value !== "object") return undefined;
  const line = value as Record<string, unknown>;
  return {
    productId: typeof line.productId === "string" ? line.productId : undefined,
    variantId: typeof line.variantId === "string" ? line.variantId : undefined,
    categoryIds: stringArray(line.categoryIds),
    tagIds: stringArray(line.tagIds),
    featureIds: stringArray(line.featureIds),
    optionValueIds: stringArray(line.optionValueIds),
  };
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
