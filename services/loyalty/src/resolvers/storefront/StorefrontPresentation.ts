import type { Catalog } from "@shopana/broker-types";
import { CURRENCY_INFO, type CurrencyCode } from "@shopana/shared-references";
import { GlobalIdEntity, encodeGlobalIdByType } from "@shopana/shared-graphql-guid";
import type {
  LoyaltyConditionExpressionV1,
  LoyaltyEarningActionV1,
  LoyaltyEarningLimitsV1,
  LoyaltyProgramRulesV1,
} from "../../contracts/types.js";
import {
  calculateRatio,
  canonicalHash,
  matchesCatalogSelector,
  modifierBasisPoints,
  multiplyBasisPoints,
} from "../../application/math.js";
import type { ServiceContext } from "../../context/types.js";
import type {
  Account,
  EarningRule,
  Program,
  ProgramVersion,
  RewardDefinition,
} from "../../repositories/models/index.js";

type OpportunityType =
  | "PURCHASE"
  | "SIGNUP"
  | "REVIEW"
  | "REFERRAL"
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "LOGIN"
  | "SUBSCRIPTION_RENEWAL"
  | "CUSTOM";

export type Copy = {
  headline: string;
  description: string | null;
  badge: string | null;
  accessibilityLabel: string;
  terms: string[];
};

type Reward = Record<string, unknown> & { __typename: string; kind: string; copy: Copy };

type Opportunity = {
  key: string;
  type: OpportunityType;
  state:
    "AVAILABLE" | "AUTHENTICATION_REQUIRED" | "COMPLETED" | "LIMIT_REACHED" | "BUDGET_EXHAUSTED";
  reward: Reward;
  presentation: Copy;
  remainingUses: string | null;
  validUntil: string | null;
};

type CatalogSubject = {
  prices: bigint[];
  lines: Array<{
    productId: string;
    variantId: string;
    categoryIds: string[];
    tagIds: string[];
    featureIds: string[];
    optionValueIds: string[];
    price: bigint;
  }>;
  revision: unknown;
};

type PresentationContext = {
  program: Program;
  version: ProgramVersion;
  account: Account | null;
  segmentIds: readonly string[];
  definitions: readonly RewardDefinition[];
  nextVersionAt: string | null;
};

export class StorefrontPresentationService {
  constructor(private readonly ctx: ServiceContext) {}

  private get locale() {
    return this.ctx.customer?.language ?? this.ctx.locale;
  }

  async product(productId: string): Promise<Record<string, unknown> | null> {
    const [base, product] = await Promise.all([
      this.context(),
      this.ctx.loaders.catalogProduct.load(productId),
    ]);
    if (!base || !product || product.status !== "published") return null;
    const subject = productSubject(product, this.ctx.currency ?? this.ctx.store.currencyCode);
    if (subject.prices.length === 0 || subject.lines.length === 0) return null;
    return this.productPresentation(base, subject);
  }

  async variant(variantId: string): Promise<Record<string, unknown> | null> {
    const [base, variant] = await Promise.all([
      this.context(),
      this.ctx.loaders.catalogVariant.load(variantId),
    ]);
    if (!base || !variant || !variant.availability.available) return null;
    const subject: CatalogSubject = {
      prices: [BigInt(variant.price.price.amountMinor)],
      lines: [
        {
          productId: variant.productId,
          variantId: variant.variantId,
          categoryIds: variant.targeting.categoryIds,
          tagIds: variant.targeting.tagIds,
          featureIds: variant.targeting.featureIds,
          optionValueIds: variant.targeting.optionValueIds,
          price: BigInt(variant.price.price.amountMinor),
        },
      ],
      revision: {
        merchandise: variant.revision,
        price: variant.price.revision,
        availability: variant.availability.revision,
      },
    };
    return this.productPresentation(base, subject);
  }

  async account(accountId: string): Promise<Record<string, unknown>> {
    const base = await this.context(accountId);
    if (!base || !base.account || base.account.status !== "ACTIVE") {
      return emptyPresentation(this.ctx.loaders.effectiveAt, { accountId });
    }
    const rules = await this.ctx.loaders.earningRulesByVersion.load(base.version.id);
    const opportunities: Opportunity[] = [];
    for (const rule of rules) {
      if (rule.triggerType === "ORDER") continue;
      const opportunity = await this.ruleOpportunity(base, rule, null);
      if (opportunity) opportunities.push(opportunity);
    }
    const presentation = opportunityPresentation(opportunities, this.ctx.loaders.effectiveAt, {
      program: base.program.revision,
      version: base.version.revision,
      account: base.account.revision,
      rules: rules.map(({ id, createdAt }) => ({ id, createdAt })),
    });
    presentation.validUntil = nearestDate(
      [
        ...opportunities.map(({ validUntil }) => validUntil),
        ...configurationBoundaries(base, rules),
      ],
      this.ctx.loaders.effectiveAt,
    );
    return presentation;
  }

  private async productPresentation(base: PresentationContext, subject: CatalogSubject) {
    const rules = await this.ctx.loaders.earningRulesByVersion.load(base.version.id);
    const opportunities: Opportunity[] = [];
    for (const rule of rules) {
      if (rule.triggerType !== "ORDER" && rule.triggerType !== "REVIEW") continue;
      const opportunity = await this.ruleOpportunity(base, rule, subject);
      if (opportunity) opportunities.push(opportunity);
    }
    const standard = this.standardPurchaseOpportunity(base, subject);
    if (standard) opportunities.push(standard);

    const purchase = opportunities.filter(({ type }) => type === "PURCHASE");
    const engagement = opportunities.filter(({ type }) => type !== "PURCHASE");
    const evaluatedAt = this.ctx.loaders.effectiveAt;
    const validUntil = nearestDate(
      [...opportunities.map((item) => item.validUntil), ...configurationBoundaries(base, rules)],
      evaluatedAt,
    );
    return {
      primaryOpportunity: opportunities[0] ?? null,
      purchaseOpportunity: purchase[0] ?? null,
      reviewOpportunity: engagement.find(({ type }) => type === "REVIEW") ?? null,
      purchaseOpportunities: purchase,
      engagementOpportunities: engagement,
      evaluatedAt,
      validUntil,
      revision: canonicalHash({
        program: base.program.revision,
        version: base.version.revision,
        account: base.account?.revision ?? null,
        subject: subject.revision,
        opportunities: opportunities.map(({ key, state, remainingUses }) => ({
          key,
          state,
          remainingUses,
        })),
      }),
    };
  }

  private async context(requiredAccountId?: string): Promise<PresentationContext | null> {
    const program = await this.ctx.loaders.activeProgram.load(this.ctx.store.id);
    if (!program) return null;
    const version = await this.ctx.loaders.effectiveProgramVersion.load(program.id);
    if (!version || !version.earningEnabled) return null;

    const customer = this.ctx.customer?.isBlocked ? null : this.ctx.customer;
    const account = requiredAccountId
      ? await this.ctx.loaders.account.load(requiredAccountId)
      : customer
        ? await this.ctx.loaders.accountByCustomerProgram.load({
            customerId: customer.id,
            programId: program.id,
          })
        : null;
    if (
      requiredAccountId &&
      (!account || account.customerId !== customer?.id || account.programId !== program.id)
    ) {
      return null;
    }
    if (account && account.status !== "ACTIVE") return null;

    const eligibility = customer
      ? await this.ctx.loaders.customerEligibility.load(customer.id)
      : null;
    const visibleAccount = customer && eligibility ? account : null;
    const segmentIds = eligibility?.segmentIds ?? [];
    const rules = version.rules as unknown as LoyaltyProgramRulesV1;
    if (!programEligible(rules, segmentIds)) return null;
    const [definitions, versions] = await Promise.all([
      this.ctx.loaders.rewardDefinitionsByVersion.load(version.id),
      this.ctx.loaders.programVersions.load(program.id),
    ]);
    const nextVersionAt =
      versions
        .filter(
          ({ status, effectiveFrom }) =>
            status === "SCHEDULED" &&
            effectiveFrom !== null &&
            Date.parse(effectiveFrom) > Date.parse(this.ctx.loaders.effectiveAt),
        )
        .map(({ effectiveFrom }) => effectiveFrom!)
        .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null;
    return { program, version, account: visibleAccount, segmentIds, definitions, nextVersionAt };
  }

  private standardPurchaseOpportunity(
    base: PresentationContext,
    subject: CatalogSubject,
  ): Opportunity | null {
    if (!base.version.earningEnabled || subject.prices.length === 0) return null;
    const rules = base.version.rules as unknown as LoyaltyProgramRulesV1;
    const eligible = subject.lines
      .filter((line) => line.price >= base.version.minimumEligibleAmountMinor)
      .filter(
        (line) =>
          !rules.earning.excludedSelectors.some((selector) =>
            matchesCatalogSelector(selector, line),
          ),
      );
    if (eligible.length === 0) return null;
    const values = eligible.map((line) => {
      const basePoints = calculateRatio(
        line.price,
        base.version.earnPoints,
        base.version.earnAmountMinor,
        base.version.roundingMode,
      );
      const modifier = modifierBasisPoints(
        rules.earning.modifiers,
        rules.earning.modifierStackingMode,
        line,
        base.segmentIds,
        this.ctx.loaders.effectiveAt,
      );
      return multiplyBasisPoints(basePoints, modifier.basisPoints, base.version.roundingMode);
    });
    const reward = pointsReward(
      range(values),
      "ESTIMATED",
      copyFrom(base.program.metadata, this.locale, `Earn ${rangeText(values)} points`),
    );
    return {
      key: `program:${base.version.id}:purchase`,
      type: "PURCHASE",
      state: base.account ? "AVAILABLE" : "AUTHENTICATION_REQUIRED",
      reward,
      presentation: reward.copy,
      remainingUses: null,
      validUntil: nearestDate(
        [
          base.version.effectiveTo,
          base.nextVersionAt,
          ...rules.earning.modifiers.flatMap(({ startsAt, endsAt }) => [startsAt, endsAt]),
        ],
        this.ctx.loaders.effectiveAt,
      ),
    };
  }

  private async ruleOpportunity(
    base: PresentationContext,
    rule: EarningRule,
    subject: CatalogSubject | null,
  ): Promise<Opportunity | null> {
    const limits = rule.limits as unknown as LoyaltyEarningLimitsV1;
    const now = this.ctx.loaders.effectiveAt;
    if (!inSchedule(limits.startsAt, limits.endsAt, now)) return null;
    const expression = rule.conditions as unknown as LoyaltyConditionExpressionV1;
    const eligibleSubject = subject
      ? {
          ...subject,
          lines: subject.lines.filter((line) =>
            conditionMatches(expression, [line], base.segmentIds, now),
          ),
        }
      : null;
    if (eligibleSubject) eligibleSubject.prices = eligibleSubject.lines.map(({ price }) => price);
    if (
      subject
        ? eligibleSubject!.lines.length === 0
        : !conditionMatches(expression, [], base.segmentIds, now)
    ) {
      return null;
    }

    const action = rule.action as unknown as LoyaltyEarningActionV1;
    const issuedDefinition =
      action.type === "ISSUE_REWARD"
        ? (base.definitions.find(({ code }) => code === action.rewardDefinitionCode) ?? null)
        : null;
    if (
      action.type === "ISSUE_REWARD" &&
      (!issuedDefinition || !inSchedule(issuedDefinition.startsAt, issuedDefinition.endsAt, now))
    )
      return null;
    const reward = this.rewardForAction(action, rule, base, eligibleSubject);
    if (!reward) return null;

    let state: Opportunity["state"] = base.account ? "AVAILABLE" : "AUTHENTICATION_REQUIRED";
    let remainingUses: string | null = null;
    const issuance = issuedDefinition
      ? await this.ctx.loaders.rewardDefinitionUsage.load({
          rewardDefinitionId: issuedDefinition.id,
          accountId: base.account?.id ?? "",
        })
      : null;
    if (
      issuedDefinition?.issuanceLimit !== null &&
      issuedDefinition?.issuanceLimit !== undefined &&
      issuance &&
      issuance.total >= issuedDefinition.issuanceLimit
    ) {
      state = "BUDGET_EXHAUSTED";
    }
    if (base.account) {
      const usage = await this.ctx.loaders.earningRuleUsage.load({
        earningRuleId: rule.id,
        accountId: base.account.id,
      });
      const accountMax =
        limits.perAccount?.maxOccurrences === null || !limits.perAccount
          ? null
          : BigInt(limits.perAccount.maxOccurrences);
      const campaignMax =
        limits.campaign?.maxOccurrences === null || !limits.campaign
          ? null
          : BigInt(limits.campaign.maxOccurrences);
      if (accountMax !== null) {
        const remaining = max(0n, accountMax - (usage.account?.occurrenceCount ?? 0n));
        remainingUses = remaining.toString();
        if (remaining === 0n) {
          state = accountMax === 1n && rule.triggerType !== "ORDER" ? "COMPLETED" : "LIMIT_REACHED";
        }
      }
      const accountMaxPoints = limits.perAccount?.maxPoints;
      if (
        accountMaxPoints !== null &&
        accountMaxPoints !== undefined &&
        (usage.account?.pointsAwarded ?? 0n) >= BigInt(accountMaxPoints)
      ) {
        state = "LIMIT_REACHED";
      }
      if (campaignMax !== null && (usage.campaign?.occurrenceCount ?? 0n) >= campaignMax) {
        state = "BUDGET_EXHAUSTED";
      }
      const campaignMaxPoints = limits.campaign?.maxPoints;
      if (
        campaignMaxPoints !== null &&
        campaignMaxPoints !== undefined &&
        (usage.campaign?.pointsAwarded ?? 0n) >= BigInt(campaignMaxPoints)
      ) {
        state = "BUDGET_EXHAUSTED";
      }
      const currency = this.ctx.currency ?? this.ctx.store.currencyCode;
      const monetaryMax = limits.campaign?.maxMonetaryMinorByCurrency[currency];
      if (
        monetaryMax !== undefined &&
        BigInt(usage.campaign?.monetaryAmounts[currency] ?? "0") >= BigInt(monetaryMax)
      ) {
        state = "BUDGET_EXHAUSTED";
      }
      if (issuedDefinition) {
        if (issuedDefinition.perAccountLimit !== null && issuance) {
          const remaining = max(0n, issuedDefinition.perAccountLimit - issuance.account);
          remainingUses =
            remainingUses === null
              ? remaining.toString()
              : min(BigInt(remainingUses), remaining).toString();
          if (remaining === 0n && state !== "BUDGET_EXHAUSTED") state = "LIMIT_REACHED";
        }
      }
    }

    return {
      key: `rule:${rule.id}`,
      type: opportunityType(rule.triggerType),
      state,
      reward,
      presentation: reward.copy,
      remainingUses,
      validUntil: nearestDate(
        [
          limits.endsAt,
          issuedDefinition?.endsAt ?? null,
          base.version.effectiveTo,
          base.nextVersionAt,
        ],
        now,
      ),
    };
  }

  private rewardForAction(
    action: LoyaltyEarningActionV1,
    rule: EarningRule,
    base: PresentationContext,
    subject: CatalogSubject | null,
  ): Reward | null {
    const fallback = rule.name;
    const copy = copyFrom(rule.triggerConfig, this.locale, fallback);
    if (action.type === "AWARD_FIXED_POINTS") {
      return pointsReward({ minimum: action.points, maximum: action.points }, "EXACT", copy);
    }
    if (action.type === "AWARD_SPEND_RATIO") {
      if (!subject) return null;
      const values = subject.prices.map((amount) =>
        calculateRatio(
          amount,
          BigInt(action.points),
          BigInt(action.amountMinor),
          base.version.roundingMode,
        ),
      );
      return pointsReward(range(values), "ESTIMATED", copy);
    }
    if (action.type === "APPLY_MULTIPLIER") {
      if (!subject) return null;
      const values = subject.prices.map((amount) => {
        const basePoints = calculateRatio(
          amount,
          base.version.earnPoints,
          base.version.earnAmountMinor,
          base.version.roundingMode,
        );
        const multiplied = multiplyBasisPoints(
          basePoints,
          action.multiplierBps,
          base.version.roundingMode,
        );
        return multiplied > basePoints ? multiplied - basePoints : 0n;
      });
      return pointsReward(range(values), "ESTIMATED", copy);
    }
    if (action.type === "AWARD_CASHBACK") {
      if (!subject) return null;
      const amounts = subject.prices.map((amount) =>
        multiplyBasisPoints(amount, action.basisPoints, "DOWN"),
      );
      if (action.settlement === "MONETARY") {
        const currency = action.currencyCode ?? this.ctx.currency ?? this.ctx.store.currencyCode;
        return moneyReward("CASHBACK", rangeMoney(amounts, currency), "ESTIMATED", copy);
      }
      const points = amounts.map((amount) =>
        calculateRatio(
          amount,
          base.version.earnPoints,
          base.version.earnAmountMinor,
          base.version.roundingMode,
        ),
      );
      return pointsReward(range(points), "ESTIMATED", copy);
    }
    const definition = base.definitions.find(({ code }) => code === action.rewardDefinitionCode);
    return definition
      ? rewardFromConfiguration(
          definition.rewardType,
          definition.configuration,
          copyFrom(definition.configuration, this.locale, rule.name),
          null,
          this.ctx,
        )
      : null;
  }
}

export function rewardFromConfiguration(
  rewardType: RewardDefinition["rewardType"],
  configuration: Record<string, unknown>,
  copy: Copy,
  externalReference: string | null,
  ctx: ServiceContext,
  quantity = 1n,
): Reward {
  if (rewardType === "POINTS") {
    const points = (BigInt(decimal(configuration.points, "0")) * quantity).toString();
    return pointsReward({ minimum: points, maximum: points }, "EXACT", copy);
  }
  if (rewardType === "MONETARY_CREDIT" || rewardType === "FIXED_DISCOUNT") {
    const currency = string(configuration.currencyCode) ?? ctx.currency ?? ctx.store.currencyCode;
    const amount = BigInt(decimal(configuration.amountMinor, "0")) * quantity;
    const kind =
      rewardType === "FIXED_DISCOUNT"
        ? "FIXED_DISCOUNT"
        : configuration.walletType === "STORE_CREDIT"
          ? "STORE_CREDIT"
          : "CASHBACK";
    return moneyReward(kind, rangeMoney([amount], currency), "EXACT", copy);
  }
  if (rewardType === "PERCENTAGE_DISCOUNT") {
    const percentage =
      configuration.percentage !== undefined
        ? decimalNumber(configuration.percentage, "0")
        : basisPointsToPercentage(configuration.basisPoints);
    return {
      __typename: "LoyaltyPercentageRewardPresentation",
      kind: "PERCENTAGE_DISCOUNT",
      copy,
      percentage,
    };
  }
  if (rewardType === "VOUCHER") {
    return {
      __typename: "LoyaltyVoucherRewardPresentation",
      kind: "VOUCHER",
      copy,
      code: externalReference ?? string(configuration.code),
    };
  }
  if (rewardType === "FREE_SHIPPING") {
    return { __typename: "LoyaltyFreeShippingRewardPresentation", kind: "FREE_SHIPPING", copy };
  }
  if (rewardType === "FREE_PRODUCT") {
    const productId = string(configuration.productId);
    const variantId = string(configuration.variantId);
    if (!productId) throw new Error("FREE_PRODUCT reward requires productId");
    return {
      __typename: "LoyaltyFreeProductRewardPresentation",
      kind: "FREE_PRODUCT",
      copy,
      product: {
        __typename: "Product",
        id: encodeGlobalIdByType(productId, GlobalIdEntity.Product),
      },
      variant: variantId
        ? {
            __typename: "ProductVariant",
            id: encodeGlobalIdByType(variantId, GlobalIdEntity.ProductVariant),
          }
        : null,
      quantity: (BigInt(decimal(configuration.quantity, "1")) * quantity).toString(),
    };
  }
  return {
    __typename: "LoyaltyMemberBenefitRewardPresentation",
    kind: "MEMBER_BENEFIT",
    copy,
    code: string(configuration.code) ?? "member-benefit",
  };
}

export function copyFrom(
  source: Record<string, unknown>,
  locale: string | undefined,
  fallback: string,
): Copy {
  const presentation = record(source.presentation) ?? record(source.copy) ?? source;
  const localized = locale
    ? (record(record(presentation.locales)?.[locale]) ??
      record(presentation[locale]) ??
      record(record(presentation.locales)?.[locale.split("-")[0]!]) ??
      record(presentation[locale.split("-")[0]!]))
    : null;
  const value = localized ?? presentation;
  const headline = string(value.headline) ?? fallback;
  return {
    headline,
    description: string(value.description),
    badge: string(value.badge),
    accessibilityLabel: string(value.accessibilityLabel) ?? headline,
    terms: Array.isArray(value.terms)
      ? value.terms.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function productSubject(product: Catalog.ProductSnapshot, currency: string): CatalogSubject {
  const currencyCode = currency.toUpperCase();
  const categoryIds = product.categories.map(({ id }) => id);
  const tagIds = product.tags.flatMap(({ id }) => (id ? [id] : []));
  const featureIds = product.features.flatMap(({ id }) => (id ? [id] : []));
  const variants = product.variants.filter(
    (variant) =>
      variant.availability.availableForSale &&
      variant.prices.some(
        (price) => price.currencyCode.toUpperCase() === currencyCode && price.amountMinor !== null,
      ),
  );
  const lines = variants.flatMap((variant) =>
    variant.prices
      .filter(
        (price) => price.currencyCode.toUpperCase() === currencyCode && price.amountMinor !== null,
      )
      .map((price) => ({
        productId: product.id,
        variantId: variant.id,
        categoryIds,
        tagIds,
        featureIds,
        optionValueIds: variant.options.flatMap((option) =>
          option.values.flatMap(({ id }) => (id ? [id] : [])),
        ),
        price: BigInt(price.amountMinor!),
      })),
  );
  const prices = lines.map(({ price }) => price);
  return { prices, lines, revision: { revision: product.revision, updatedAt: product.updatedAt } };
}

function conditionMatches(
  expression: LoyaltyConditionExpressionV1,
  lines: CatalogSubject["lines"],
  segmentIds: readonly string[],
  at: string,
): boolean {
  switch (expression.type) {
    case "ALL":
      return expression.conditions.every((item) => conditionMatches(item, lines, segmentIds, at));
    case "ANY":
      return expression.conditions.some((item) => conditionMatches(item, lines, segmentIds, at));
    case "NOT":
      return !conditionMatches(expression.condition, lines, segmentIds, at);
    case "SEGMENT": {
      const current = new Set(segmentIds);
      return expression.match === "ALL"
        ? expression.segmentIds.every((id) => current.has(id))
        : expression.segmentIds.some((id) => current.has(id));
    }
    case "CATALOG":
      return lines.some((line) => selectorMatches(expression.selector, line));
    case "SCHEDULE":
      return inSchedule(expression.startsAt, expression.endsAt, at);
    case "CHANNEL":
    case "PAYMENT_METHOD":
    case "FIRST_PURCHASE":
    case "EVENT_FIELD":
      return false;
  }
}

function selectorMatches(
  selector: Extract<LoyaltyConditionExpressionV1, { type: "CATALOG" }>["selector"],
  line: CatalogSubject["lines"][number],
) {
  if (selector.type === "ALL") return true;
  const values =
    selector.type === "PRODUCT"
      ? [line.productId]
      : selector.type === "VARIANT"
        ? [line.variantId]
        : selector.type === "CATEGORY"
          ? line.categoryIds
          : selector.type === "TAG"
            ? line.tagIds
            : selector.type === "FEATURE"
              ? line.featureIds
              : line.optionValueIds;
  const selected = new Set(selector.ids);
  return values.some((value) => selected.has(value));
}

function programEligible(rules: LoyaltyProgramRulesV1, segments: readonly string[]): boolean {
  const eligibility = rules.eligibility;
  const current = new Set(segments);
  if (eligibility.excludedSegmentIds.some((id) => current.has(id))) return false;
  if (eligibility.type === "ALL") return true;
  return eligibility.segmentMatchMode === "ALL"
    ? eligibility.segmentIds.every((id) => current.has(id))
    : eligibility.segmentIds.some((id) => current.has(id));
}

function opportunityType(trigger: EarningRule["triggerType"]): OpportunityType {
  return trigger === "ORDER" ? "PURCHASE" : trigger === "CUSTOM_EVENT" ? "CUSTOM" : trigger;
}

function opportunityPresentation(
  opportunities: Opportunity[],
  evaluatedAt: string,
  revisionValue: unknown,
) {
  return {
    primaryOpportunity: opportunities[0] ?? null,
    opportunities,
    evaluatedAt,
    validUntil: nearestDate(
      opportunities.map(({ validUntil }) => validUntil),
      evaluatedAt,
    ),
    revision: canonicalHash({
      source: revisionValue,
      opportunities: opportunities.map(({ key, state, remainingUses, validUntil }) => ({
        key,
        state,
        remainingUses,
        validUntil,
      })),
    }),
  };
}

function configurationBoundaries(base: PresentationContext, rules: readonly EarningRule[]) {
  const programRules = base.version.rules as unknown as LoyaltyProgramRulesV1;
  return [
    base.version.effectiveTo,
    base.nextVersionAt,
    ...programRules.earning.modifiers.flatMap(({ startsAt, endsAt }) => [startsAt, endsAt]),
    ...rules.flatMap((rule) => {
      const limits = rule.limits as unknown as LoyaltyEarningLimitsV1;
      return [limits.startsAt, limits.endsAt];
    }),
    ...base.definitions.flatMap(({ startsAt, endsAt }) => [startsAt, endsAt]),
  ];
}

function emptyPresentation(evaluatedAt: string, revisionValue: unknown) {
  return opportunityPresentation([], evaluatedAt, revisionValue);
}

function pointsReward(
  value: { minimum: string; maximum: string },
  accuracy: "EXACT" | "ESTIMATED",
  copy: Copy,
): Reward {
  return {
    __typename: "LoyaltyPointsRewardPresentation",
    kind: "POINTS",
    copy,
    points: value,
    accuracy,
  };
}

function moneyReward(
  kind: string,
  amount: unknown,
  accuracy: "EXACT" | "ESTIMATED",
  copy: Copy,
): Reward {
  return { __typename: "LoyaltyMoneyRewardPresentation", kind, copy, amount, accuracy };
}

function range(values: readonly bigint[]) {
  const sorted = [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  return { minimum: (sorted[0] ?? 0n).toString(), maximum: (sorted.at(-1) ?? 0n).toString() };
}

function rangeText(values: readonly bigint[]) {
  const value = range(values);
  return value.minimum === value.maximum ? value.minimum : `${value.minimum}–${value.maximum}`;
}

function rangeMoney(values: readonly bigint[], currency: string) {
  const value = range(values);
  return {
    minimum: minorMoney(BigInt(value.minimum), currency),
    maximum: minorMoney(BigInt(value.maximum), currency),
  };
}

function minorMoney(amountMinor: bigint, currency: string) {
  const normalized = currency.toUpperCase();
  const decimalPlaces = CURRENCY_INFO[normalized as CurrencyCode]?.decimalPlaces;
  if (decimalPlaces === undefined)
    throw new Error(`Unsupported storefront currency: ${normalized}`);
  const digits = amountMinor.toString().padStart(decimalPlaces + 1, "0");
  return {
    amount:
      decimalPlaces === 0
        ? digits
        : `${digits.slice(0, -decimalPlaces)}.${digits.slice(-decimalPlaces)}`,
    currencyCode: normalized,
  };
}

function inSchedule(startsAt: string | null, endsAt: string | null, at: string) {
  const time = Date.parse(at);
  return (
    (startsAt === null || Date.parse(startsAt) <= time) &&
    (endsAt === null || time < Date.parse(endsAt))
  );
}

function nearestDate(values: readonly (string | null)[], after: string): string | null {
  const boundary = Date.parse(after);
  return (
    values
      .filter((value): value is string => value !== null && Date.parse(value) > boundary)
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null
  );
}

function basisPointsToPercentage(value: unknown): string {
  const basisPoints = BigInt(decimal(value, "0"));
  const digits = basisPoints.toString().padStart(3, "0");
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`.replace(/\.00$/, "");
}

function decimal(value: unknown, fallback: string): string {
  return typeof value === "string" && /^\d+$/.test(value)
    ? value
    : typeof value === "number" && Number.isSafeInteger(value) && value >= 0
      ? String(value)
      : fallback;
}

function decimalNumber(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return String(value);
  return fallback;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function max(left: bigint, right: bigint) {
  return left > right ? left : right;
}

function min(left: bigint, right: bigint) {
  return left < right ? left : right;
}
