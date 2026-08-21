import type { Repository } from "../../repositories/Repository.js";
import type { Account, Tier, TierMembership, TierPolicy } from "../../repositories/models/index.js";
import type { LoyaltyTierMetricExpressionV1 } from "../../contracts/types.js";
import { LoyaltyDomainError } from "../errors.js";
import { canonicalHash, evaluateTierExpression, type TierMetrics } from "../math.js";
import { RewardEntitlementService } from "../rewards/RewardEntitlementService.js";

export class TierEvaluationService {
  constructor(private readonly repository: Repository) {}

  async revoke(input: {
    membershipId: string;

    effectiveAt: string;
    reasonCode: string;
    actorId: string;
  }): Promise<TierMembership> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.tier
        .getMembershipsByIds([input.membershipId])
        .then((rows) => rows[0] ?? null);
      if (!current)
        throw new LoyaltyDomainError(
          "TIER_MEMBERSHIP_NOT_FOUND",
          "Loyalty tier membership was not found",
        );
      if (current.status === "REVOKED") return current;
      if (current.status !== "ACTIVE")
        throw new LoyaltyDomainError(
          "TIER_MEMBERSHIP_NOT_ACTIVE",
          "Only an active tier membership can be revoked",
        );
      const updated = await this.repository.tier.updateMembership(current.id, {
        status: "REVOKED",
        effectiveTo: input.effectiveAt,
      });
      if (!updated)
        throw new LoyaltyDomainError(
          "TIER_CONCURRENT_CHANGE",
          "Tier membership changed concurrently",
          true,
        );
      await this.repository.tier.appendMembershipEvent({
        accountId: current.accountId,
        membershipId: current.id,
        previousTierId: current.tierId,
        tierId: current.tierId,
        eventType: "REVOKED",
        evaluationRevision: canonicalHash({
          membershipId: current.id,
          actorId: input.actorId,
        }),
        reasonCode: input.reasonCode,
        occurredAt: input.effectiveAt,
        metadata: { actorId: input.actorId },
      });
      return updated;
    });
  }

  async evaluate(input: {
    account: Account;
    programVersionId: string;
    effectiveAt: string;
    additionalMetrics?: TierMetrics;
    reasonCode?: string;
    forceRequalification?: boolean;
  }): Promise<TierMembership | null> {
    return this.repository.runInTransaction(async () => {
      const lockedAccount = await this.repository.account.lockById(input.account.id);
      if (!lockedAccount)
        throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      if (lockedAccount.status !== "ACTIVE") {
        throw new LoyaltyDomainError(
          "ACCOUNT_NOT_ACTIVE",
          "Tiers can be evaluated only for an active loyalty account",
        );
      }
      const [policy, tiers, current] = await Promise.all([
        this.repository.tier.findPolicy(input.programVersionId),
        this.repository.tier.listForVersion(input.programVersionId),
        this.repository.tier.lockActiveMembership(input.account.id),
      ]);
      if (!policy || tiers.length === 0) return current;
      const period = this.evaluationPeriod(policy, input.account, input.effectiveAt);
      const metrics = await this.collectMetrics(
        input.account,
        period.start,
        period.end,
        input.additionalMetrics,
      );
      const qualified =
        [...tiers]
          .sort((left, right) => right.rank - left.rank || left.id.localeCompare(right.id))
          .find((tier) =>
            evaluateTierExpression(
              tier.qualification as unknown as LoyaltyTierMetricExpressionV1,
              metrics,
            ),
          ) ?? null;
      const currentTier = current ? await this.repository.tier.findTierById(current.tierId) : null;
      if (
        current?.effectiveTo &&
        Date.parse(current.effectiveTo) <= Date.parse(input.effectiveAt) &&
        policy.requalificationPolicy === "MANUAL" &&
        !input.forceRequalification
      ) {
        await this.endMembership(
          current,
          input.effectiveAt,
          "EXPIRED",
          input.reasonCode ?? "TIER_MANUAL_REQUALIFICATION_REQUIRED",
          metrics,
        );
        return null;
      }
      const maintained =
        currentTier && currentTier.maintenance
          ? evaluateTierExpression(
              currentTier.maintenance as unknown as LoyaltyTierMetricExpressionV1,
              metrics,
            )
          : currentTier !== null;
      const selected = this.selectTier(
        policy,
        current,
        currentTier,
        qualified,
        maintained,
        input.effectiveAt,
      );
      if (!selected) {
        if (current)
          await this.endMembership(
            current,
            input.effectiveAt,
            "EXPIRED",
            input.reasonCode ?? "TIER_NOT_MAINTAINED",
            metrics,
          );
        return null;
      }
      if (current && current.tierId === selected.id) {
        if (
          policy.requalificationPolicy === "AUTOMATIC" &&
          current.effectiveTo !== null &&
          Date.parse(current.effectiveTo) <= Date.parse(input.effectiveAt)
        ) {
          return this.renew(
            input.account,
            current,
            selected,
            policy,
            period,
            input.effectiveAt,
            metrics,
          );
        }
        return current;
      }
      const previousTier = currentTier;
      if (current)
        await this.endMembership(current, input.effectiveAt, "EXPIRED", "TIER_REPLACED", metrics);
      const effectiveTo =
        policy.membershipDurationDays === null
          ? null
          : new Date(
              Date.parse(input.effectiveAt) + policy.membershipDurationDays * 86_400_000,
            ).toISOString();
      const membership = await this.repository.tier.createMembership({
        accountId: input.account.id,
        tierId: selected.id,
        status: "ACTIVE",
        evaluationPeriodStartedAt: period.start,
        evaluationPeriodEndedAt: period.end,
        qualifiedAt: input.effectiveAt,
        effectiveFrom: input.effectiveAt,
        effectiveTo,
      });
      const eventType =
        previousTier === null
          ? "QUALIFIED"
          : selected.rank > previousTier.rank
            ? "UPGRADED"
            : "DOWNGRADED";
      await this.repository.tier.appendMembershipEvent({
        accountId: input.account.id,
        membershipId: membership.id,
        previousTierId: previousTier?.id ?? null,
        tierId: selected.id,
        eventType,
        evaluationRevision: canonicalHash({
          metrics,
          programVersionId: input.programVersionId,
          period,
        }),
        reasonCode: input.reasonCode ?? `TIER_${eventType}`,
        occurredAt: input.effectiveAt,
        metadata: this.metricsJson(metrics),
      });
      await new RewardEntitlementService(this.repository).issueTierBenefits({
        account: input.account,
        tierId: selected.id,
        membershipId: membership.id,
        occurredAt: input.effectiveAt,
      });
      return membership;
    });
  }

  private selectTier(
    policy: TierPolicy,
    current: TierMembership | null,
    currentTier: Tier | null,
    qualified: Tier | null,
    maintained: boolean,
    at: string,
  ): Tier | null {
    if (!current || !currentTier) return qualified;
    if (qualified && qualified.rank >= currentTier.rank) return qualified;
    if (maintained) return currentTier;
    if (
      policy.downgradePolicy === "END_OF_MEMBERSHIP" &&
      (current.effectiveTo === null || Date.parse(current.effectiveTo) > Date.parse(at))
    )
      return currentTier;
    if (policy.downgradePolicy === "GRACE_PERIOD") {
      const graceEnd = Date.parse(current.effectiveFrom) + policy.gracePeriodDays * 86_400_000;
      if (Date.parse(at) < graceEnd) return currentTier;
    }
    return qualified;
  }

  private async collectMetrics(
    account: Account,
    start: string,
    end: string,
    additional: TierMetrics = {},
  ): Promise<TierMetrics> {
    const [transactions, facts] = await Promise.all([
      this.repository.ledger.listAllTransactions(account.id),
      this.repository.event.listAllFactsForCustomer(account.customerId),
    ]);
    const inWindow = transactions.filter(
      ({ occurredAt }) =>
        Date.parse(occurredAt) >= Date.parse(start) && Date.parse(occurredAt) <= Date.parse(end),
    );
    const qualifyingPoints = inWindow.reduce((sum, transaction) => {
      if (transaction.kind === "EARN_PENDING") {
        return (
          sum +
          BigInt(String(transaction.metadata.awardedPoints ?? transaction.metadata.points ?? "0"))
        );
      }
      if (transaction.kind === "REVERSE_EARN") {
        return sum - BigInt(String(transaction.metadata.points ?? "0"));
      }
      return sum;
    }, 0n);
    const netSpendByCurrency = new Map<string, bigint>();
    const orders = new Set<string>();
    const windowFacts = facts.filter(
      ({ occurredAt }) =>
        Date.parse(occurredAt) >= Date.parse(start) && Date.parse(occurredAt) <= Date.parse(end),
    );
    for (const fact of windowFacts) {
      if (fact.eventType !== "orderRewardEligible" && fact.eventType !== "orderRewardReversed")
        continue;
      const currency =
        typeof fact.payload.currencyCode === "string" ? fact.payload.currencyCode : null;
      const orderId = typeof fact.payload.orderId === "string" ? fact.payload.orderId : null;
      const rawAmount = String(fact.payload.eligibleAmountAfterAllDiscountsMinor ?? "0");
      const amount = /^(0|[1-9][0-9]*)$/.test(rawAmount) ? BigInt(rawAmount) : 0n;
      if (currency) {
        const direction = fact.eventType === "orderRewardReversed" ? -amount : amount;
        netSpendByCurrency.set(currency, (netSpendByCurrency.get(currency) ?? 0n) + direction);
      }
      if (fact.eventType === "orderRewardEligible" && orderId) orders.add(orderId);
    }
    const metrics: Record<string, bigint> = {
      ...additional,
      "QUALIFYING_POINTS:": qualifyingPoints,
      "ORDER_COUNT:": BigInt(orders.size),
      "REFERRAL_COUNT:": BigInt(
        windowFacts.filter(({ eventType }) => eventType.toLowerCase().includes("referral")).length,
      ),
    };
    for (const [currency, amount] of netSpendByCurrency)
      metrics[`NET_SPEND_MINOR:${currency}`] = amount;
    for (const fact of windowFacts) {
      const custom = fact.payload.metrics;
      if (!custom || typeof custom !== "object" || Array.isArray(custom)) continue;
      for (const [code, value] of Object.entries(custom as Record<string, unknown>)) {
        if (typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value))
          metrics[`CUSTOM:${code}:`] = (metrics[`CUSTOM:${code}:`] ?? 0n) + BigInt(value);
      }
    }
    return metrics;
  }

  private evaluationPeriod(policy: TierPolicy, account: Account, at: string) {
    const date = new Date(at);
    if (policy.windowType === "LIFETIME") return { start: account.openedAt, end: at };
    if (policy.windowType === "ROLLING") {
      return {
        start: new Date(Date.parse(at) - policy.rollingWindowDays! * 86_400_000).toISOString(),
        end: at,
      };
    }
    if (policy.calendarPeriod === "MONTH") {
      return {
        start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString(),
        end: at,
      };
    }
    if (policy.calendarPeriod === "QUARTER") {
      return {
        start: new Date(
          Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1),
        ).toISOString(),
        end: at,
      };
    }
    if (policy.calendarPeriod === "PROGRAM_YEAR") {
      const month = policy.programYearStartsMonth! - 1;
      const year = date.getUTCMonth() < month ? date.getUTCFullYear() - 1 : date.getUTCFullYear();
      return { start: new Date(Date.UTC(year, month, 1)).toISOString(), end: at };
    }
    return { start: new Date(Date.UTC(date.getUTCFullYear(), 0, 1)).toISOString(), end: at };
  }

  private async endMembership(
    current: TierMembership,
    at: string,
    status: "EXPIRED" | "REVOKED",
    reasonCode: string,
    metrics: TierMetrics,
  ): Promise<void> {
    const updated = await this.repository.tier.updateMembership(current.id, {
      status,
      effectiveTo: at,
    });
    if (!updated)
      throw new LoyaltyDomainError(
        "TIER_CONCURRENT_CHANGE",
        "Tier membership changed concurrently",
        true,
      );
    await this.repository.tier.appendMembershipEvent({
      accountId: current.accountId,
      membershipId: current.id,
      previousTierId: current.tierId,
      tierId: current.tierId,
      eventType: status,
      evaluationRevision: canonicalHash({ membershipId: current.id, metrics, at }),
      reasonCode,
      occurredAt: at,
      metadata: this.metricsJson(metrics),
    });
  }

  private async renew(
    account: Account,
    current: TierMembership,
    tier: Tier,
    policy: TierPolicy,
    period: { start: string; end: string },
    at: string,
    metrics: TierMetrics,
  ): Promise<TierMembership> {
    await this.endMembership(current, at, "EXPIRED", "TIER_RENEWED", metrics);
    const membership = await this.repository.tier.createMembership({
      accountId: current.accountId,
      tierId: tier.id,
      status: "ACTIVE",
      evaluationPeriodStartedAt: period.start,
      evaluationPeriodEndedAt: period.end,
      qualifiedAt: at,
      effectiveFrom: at,
      effectiveTo:
        policy.membershipDurationDays === null
          ? null
          : new Date(Date.parse(at) + policy.membershipDurationDays * 86_400_000).toISOString(),
    });
    await this.repository.tier.appendMembershipEvent({
      accountId: current.accountId,
      membershipId: membership.id,
      previousTierId: current.tierId,
      tierId: tier.id,
      eventType: "RENEWED",
      evaluationRevision: canonicalHash({ membershipId: membership.id, metrics, at }),
      reasonCode: "TIER_RENEWED",
      occurredAt: at,
      metadata: this.metricsJson(metrics),
    });
    await new RewardEntitlementService(this.repository).issueTierBenefits({
      account,
      tierId: tier.id,
      membershipId: membership.id,
      occurredAt: at,
      renewal: true,
    });
    return membership;
  }

  private metricsJson(metrics: TierMetrics): Record<string, string> {
    return Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [key, value.toString()]),
    );
  }
}
