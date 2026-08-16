import { z } from "zod";
import type { LoyaltyEarningActionType, LoyaltyRewardType } from "../../contracts/types.js";
import { LoyaltyDomainError } from "../errors.js";

const decimal = z.string().regex(/^(0|[1-9][0-9]*)$/);
const positiveDecimal = z.string().regex(/^[1-9][0-9]*$/);
const nonBlank = z.string().trim().min(1);
const dateTime = z.string().datetime({ offset: true });

const catalogSelectorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ALL"), ids: z.tuple([]) }).strict(),
  z.object({ type: z.enum(["PRODUCT", "VARIANT", "CATEGORY", "TAG", "FEATURE", "OPTION_VALUE"]), ids: z.array(nonBlank).min(1) }).strict(),
]);

export const loyaltyConditionExpressionSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.enum(["ALL", "ANY"]), conditions: z.array(loyaltyConditionExpressionSchema) }).strict(),
    z.object({ type: z.literal("NOT"), condition: loyaltyConditionExpressionSchema }).strict(),
    z.object({ type: z.literal("SEGMENT"), match: z.enum(["ANY", "ALL"]), segmentIds: z.array(nonBlank).min(1) }).strict(),
    z.object({ type: z.literal("CHANNEL"), channelCodes: z.array(nonBlank).min(1) }).strict(),
    z.object({ type: z.literal("CATALOG"), selector: catalogSelectorSchema }).strict(),
    z.object({ type: z.literal("PAYMENT_METHOD"), paymentMethodCodes: z.array(nonBlank).min(1) }).strict(),
    z.object({ type: z.literal("FIRST_PURCHASE") }).strict(),
    z.object({ type: z.literal("SCHEDULE"), startsAt: dateTime.nullable(), endsAt: dateTime.nullable() }).strict(),
    z.object({
      type: z.literal("EVENT_FIELD"),
      path: z.array(nonBlank).min(1),
      operator: z.enum(["EQ", "NE", "IN", "GTE", "GT", "LTE", "LT"]),
      value: z.unknown(),
    }).strict(),
  ]).superRefine((value, ctx) => {
    if (value.type === "SCHEDULE" && value.startsAt && value.endsAt && Date.parse(value.startsAt) >= Date.parse(value.endsAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "endsAt must be after startsAt" });
    }
  }),
);

const earningActions = {
  AWARD_FIXED_POINTS: z.object({ type: z.literal("AWARD_FIXED_POINTS"), points: positiveDecimal }).strict(),
  AWARD_SPEND_RATIO: z.object({ type: z.literal("AWARD_SPEND_RATIO"), points: positiveDecimal, amountMinor: positiveDecimal }).strict(),
  AWARD_CASHBACK: z.object({ type: z.literal("AWARD_CASHBACK"), basisPoints: z.number().int().positive().max(10_000), settlement: z.enum(["POINTS", "MONETARY"]), currencyCode: z.string().regex(/^[A-Z]{3}$/).nullable() }).strict().superRefine((value, ctx) => {
    if ((value.settlement === "MONETARY") !== (value.currencyCode !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currencyCode"], message: "currencyCode is required only for MONETARY settlement" });
  }),
  APPLY_MULTIPLIER: z.object({ type: z.literal("APPLY_MULTIPLIER"), multiplierBps: z.number().int().positive() }).strict(),
  ISSUE_REWARD: z.object({ type: z.literal("ISSUE_REWARD"), rewardDefinitionCode: nonBlank }).strict(),
} satisfies Record<LoyaltyEarningActionType, z.ZodTypeAny>;

const earningTriggerConfigSchema = z.object({
  eventType: nonBlank.optional(),
  eventTypes: z.array(nonBlank).min(1).optional(),
  producer: nonBlank.optional(),
  subjectType: nonBlank.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.eventType && value.eventTypes) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "eventType and eventTypes are mutually exclusive" });
});

const limitWindowSchema = z.object({
  type: z.enum(["LIFETIME", "DAY", "WEEK", "MONTH", "ROLLING"]),
  rollingWindowSeconds: z.number().int().positive().nullable(),
}).strict().superRefine((value, ctx) => {
  if ((value.type === "ROLLING") !== (value.rollingWindowSeconds !== null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rollingWindowSeconds"], message: "rollingWindowSeconds is required only for ROLLING windows" });
  }
});

export const loyaltyEarningLimitsSchema = z.object({
  startsAt: dateTime.nullable(),
  endsAt: dateTime.nullable(),
  perEventMaxPoints: decimal.nullable(),
  perAccount: z.object({ maxOccurrences: decimal.nullable(), maxPoints: decimal.nullable(), window: limitWindowSchema }).strict().nullable(),
  campaign: z.object({ maxOccurrences: decimal.nullable(), maxPoints: decimal.nullable(), maxMonetaryMinorByCurrency: z.record(z.string().regex(/^[A-Z]{3}$/), decimal) }).strict().nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && Date.parse(value.startsAt) >= Date.parse(value.endsAt)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "endsAt must be after startsAt" });
});

export const loyaltyTierExpressionSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.enum(["ALL", "ANY"]), expressions: z.array(loyaltyTierExpressionSchema) }).strict(),
    z.object({ type: z.literal("NOT"), expression: loyaltyTierExpressionSchema }).strict(),
    z.object({
      type: z.literal("METRIC"),
      metric: z.enum(["QUALIFYING_POINTS", "NET_SPEND_MINOR", "ORDER_COUNT", "REFERRAL_COUNT", "CUSTOM"]),
      customMetricCode: nonBlank.nullable(),
      operator: z.enum(["GTE", "GT"]),
      threshold: decimal,
      currencyCode: z.string().length(3).nullable(),
    }).strict(),
  ]).superRefine((value, ctx) => {
    if (value.type !== "METRIC") return;
    if ((value.metric === "CUSTOM") !== (value.customMetricCode !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customMetricCode"], message: "customMetricCode is required only for CUSTOM metrics" });
    if ((value.metric === "NET_SPEND_MINOR") !== (value.currencyCode !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currencyCode"], message: "currencyCode is required only for NET_SPEND_MINOR" });
  }),
);

const rewardConfigurations = {
  POINTS: z.object({ points: positiveDecimal }).strict(),
  VOUCHER: z.object({ externalDiscountId: nonBlank }).strict(),
  FIXED_DISCOUNT: z.object({ externalDiscountId: nonBlank }).strict(),
  PERCENTAGE_DISCOUNT: z.object({ externalDiscountId: nonBlank }).strict(),
  FREE_SHIPPING: z.object({ externalDiscountId: nonBlank }).strict(),
  FREE_PRODUCT: z.object({ externalDiscountId: nonBlank }).strict(),
  MEMBER_BENEFIT: z.object({ benefitCode: nonBlank }).strict(),
  MONETARY_CREDIT: z.object({ amountMinor: positiveDecimal, currencyCode: z.string().regex(/^[A-Z]{3}$/), walletType: z.enum(["CASHBACK", "STORE_CREDIT"]) }).strict(),
} satisfies Record<LoyaltyRewardType, z.ZodTypeAny>;

export function validateEarningRulePolicy(input: {
  actionType: LoyaltyEarningActionType;
  triggerConfig: unknown;
  action: unknown;
  conditions: unknown;
  limits: unknown;
  triggerSchemaVersion: number;
  conditionSchemaVersion: number;
  actionSchemaVersion: number;
  limitSchemaVersion: number;
}): void {
  requireV1([input.triggerSchemaVersion, input.conditionSchemaVersion, input.actionSchemaVersion, input.limitSchemaVersion], "earning rule");
  parsePolicy(earningTriggerConfigSchema, input.triggerConfig, "triggerConfig");
  parsePolicy(loyaltyConditionExpressionSchema, input.conditions, "conditions");
  parsePolicy(earningActions[input.actionType], input.action, "action");
  parsePolicy(loyaltyEarningLimitsSchema, input.limits, "limits");
}

export function validateTierPolicyExpression(value: unknown, field: string, schemaVersion = 1): void {
  requireV1([schemaVersion], field);
  parsePolicy(loyaltyTierExpressionSchema, value, field);
}

export function validateTierMetricSchemaVersion(schemaVersion: number): void {
  requireV1([schemaVersion], "tier metric");
}

const tierRewardGrantPolicySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ON_QUALIFICATION") }).strict(),
  z.object({ type: z.literal("ON_EVERY_QUALIFICATION") }).strict(),
]);

export function validateTierRewardGrantPolicy(value: unknown, schemaVersion: number): void {
  requireV1([schemaVersion], "tier reward grant policy");
  parsePolicy(tierRewardGrantPolicySchema, value, "grantPolicy");
}

export function validateRewardConfiguration(rewardType: LoyaltyRewardType, configuration: unknown, schemaVersion: number): void {
  requireV1([schemaVersion], "reward configuration");
  parsePolicy(rewardConfigurations[rewardType], configuration, "configuration");
}

export function rewardExternalDiscountId(rewardType: LoyaltyRewardType, configuration: unknown): string | null {
  const parsed = rewardConfigurations[rewardType].parse(configuration) as { externalDiscountId?: string };
  return parsed.externalDiscountId ?? null;
}

function requireV1(versions: readonly number[], name: string): void {
  if (versions.some((version) => version !== 1)) throw new LoyaltyDomainError("UNSUPPORTED_POLICY_SCHEMA_VERSION", `Only ${name} schema version 1 is supported`);
}

function parsePolicy(schema: z.ZodTypeAny, value: unknown, field: string): void {
  const parsed = schema.safeParse(value);
  if (parsed.success) return;
  throw new LoyaltyDomainError(
    "INVALID_POLICY",
    parsed.error.issues.map((issue) => `${field}${issue.path.length ? `.${issue.path.join(".")}` : ""}: ${issue.message}`).join("; "),
  );
}
