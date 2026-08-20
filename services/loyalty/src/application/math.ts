import { hashContent } from "@shopana/shared-kernel";
import type {
  LoyaltyCatalogSelector,
  LoyaltyConditionExpressionV1,
  LoyaltyEarningModifierV1,
  LoyaltyJsonValue,
  LoyaltyModifierStackingMode,
  LoyaltyRoundingMode,
  LoyaltyTierMetricExpressionV1,
} from "../contracts/types.js";
import { LoyaltyDomainError } from "./errors.js";

const DECIMAL = /^(0|[1-9][0-9]*)$/;

export function parsePoints(value: string, field = "points"): bigint {
  if (!DECIMAL.test(value)) {
    throw new LoyaltyDomainError(
      "INVALID_DECIMAL",
      `${field} must be a non-negative decimal integer`,
    );
  }
  return BigInt(value);
}

export function parsePositive(value: string, field = "value"): bigint {
  const parsed = parsePoints(value, field);
  if (parsed <= 0n) {
    throw new LoyaltyDomainError("INVALID_DECIMAL", `${field} must be greater than zero`);
  }
  return parsed;
}

export function divideRounded(
  numerator: bigint,
  denominator: bigint,
  mode: LoyaltyRoundingMode,
): bigint {
  if (denominator <= 0n || numerator < 0n) {
    throw new LoyaltyDomainError("INVALID_RATIO", "Loyalty ratio operands are invalid");
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n || mode === "DOWN") return quotient;
  if (mode === "UP") return quotient + 1n;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

export function calculateRatio(
  amount: bigint,
  units: bigint,
  unitAmount: bigint,
  mode: LoyaltyRoundingMode,
): bigint {
  return divideRounded(amount * units, unitAmount, mode);
}

export function multiplyBasisPoints(
  value: bigint,
  basisPoints: number,
  mode: LoyaltyRoundingMode,
): bigint {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new LoyaltyDomainError(
      "INVALID_BASIS_POINTS",
      "Basis points must be a non-negative integer",
    );
  }
  return divideRounded(value * BigInt(basisPoints), 10_000n, mode);
}

export function canonicalHash(value: unknown): string {
  return hashContent(normalizeForHash(value));
}

function normalizeForHash(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForHash(item)]),
    );
  }
  return value;
}

export interface CatalogLineContext {
  productId?: string;
  variantId?: string;
  categoryIds?: readonly string[];
  tagIds?: readonly string[];
  featureIds?: readonly string[];
  optionValueIds?: readonly string[];
}

export function matchesCatalogSelector(
  selector: LoyaltyCatalogSelector,
  line: CatalogLineContext,
): boolean {
  if (selector.type === "ALL") return true;
  const selected = new Set(selector.ids);
  switch (selector.type) {
    case "PRODUCT":
      return line.productId !== undefined && selected.has(line.productId);
    case "VARIANT":
      return line.variantId !== undefined && selected.has(line.variantId);
    case "CATEGORY":
      return (line.categoryIds ?? []).some((id) => selected.has(id));
    case "TAG":
      return (line.tagIds ?? []).some((id) => selected.has(id));
    case "FEATURE":
      return (line.featureIds ?? []).some((id) => selected.has(id));
    case "OPTION_VALUE":
      return (line.optionValueIds ?? []).some((id) => selected.has(id));
  }
}

export function modifierBasisPoints(
  modifiers: readonly LoyaltyEarningModifierV1[],
  stacking: LoyaltyModifierStackingMode,
  line: CatalogLineContext,
  segmentIds: readonly string[],
  occurredAt: string,
): { basisPoints: number; modifierIds: string[] } {
  const segments = new Set(segmentIds);
  const at = Date.parse(occurredAt);
  const matching = modifiers
    .filter((modifier) => matchesCatalogSelector(modifier.selector, line))
    .filter(
      (modifier) =>
        modifier.segmentIds.length === 0 || modifier.segmentIds.some((id) => segments.has(id)),
    )
    .filter(
      (modifier) =>
        (modifier.startsAt === null || Date.parse(modifier.startsAt) <= at) &&
        (modifier.endsAt === null || at < Date.parse(modifier.endsAt)),
    )
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  if (matching.length === 0) return { basisPoints: 10_000, modifierIds: [] };
  if (stacking === "HIGHEST") {
    const highest = matching.reduce((current, item) =>
      item.multiplierBps > current.multiplierBps ? item : current,
    );
    return { basisPoints: highest.multiplierBps, modifierIds: [highest.id] };
  }
  if (stacking === "ADD") {
    const basisPoints =
      10_000 + matching.reduce((sum, item) => sum + item.multiplierBps - 10_000, 0);
    requireSafeBasisPoints(basisPoints);
    return {
      basisPoints,
      modifierIds: matching.map(({ id }) => id),
    };
  }
  const multipliedValue = matching.reduce(
    (value, item) => (value * BigInt(item.multiplierBps)) / 10_000n,
    10_000n,
  );
  const multiplied = Number(multipliedValue);
  requireSafeBasisPoints(multiplied);
  return { basisPoints: multiplied, modifierIds: matching.map(({ id }) => id) };
}

function requireSafeBasisPoints(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LoyaltyDomainError(
      "MODIFIER_OVERFLOW",
      "Combined loyalty modifiers exceed the supported integer range",
    );
  }
}

export interface ConditionContext {
  channelCode?: string;
  segmentIds: readonly string[];
  paymentMethodCode?: string;
  firstPurchase?: boolean;
  occurredAt: string;
  catalog?: CatalogLineContext;
  event: Record<string, unknown>;
}

export function evaluateCondition(
  expression: LoyaltyConditionExpressionV1,
  context: ConditionContext,
): boolean {
  switch (expression.type) {
    case "ALL":
      return expression.conditions.every((item) => evaluateCondition(item, context));
    case "ANY":
      return expression.conditions.some((item) => evaluateCondition(item, context));
    case "NOT":
      return !evaluateCondition(expression.condition, context);
    case "SEGMENT": {
      const segments = new Set(context.segmentIds);
      return expression.match === "ALL"
        ? expression.segmentIds.every((id) => segments.has(id))
        : expression.segmentIds.some((id) => segments.has(id));
    }
    case "CHANNEL":
      return (
        context.channelCode !== undefined && expression.channelCodes.includes(context.channelCode)
      );
    case "CATALOG":
      return (
        context.catalog !== undefined &&
        matchesCatalogSelector(expression.selector, context.catalog)
      );
    case "PAYMENT_METHOD":
      return (
        context.paymentMethodCode !== undefined &&
        expression.paymentMethodCodes.includes(context.paymentMethodCode)
      );
    case "FIRST_PURCHASE":
      return context.firstPurchase === true;
    case "SCHEDULE": {
      const at = Date.parse(context.occurredAt);
      return (
        (expression.startsAt === null || Date.parse(expression.startsAt) <= at) &&
        (expression.endsAt === null || at < Date.parse(expression.endsAt))
      );
    }
    case "EVENT_FIELD": {
      const actual = readPath(context.event, expression.path);
      return compareJson(actual, expression.operator, expression.value);
    }
  }
}

function readPath(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (current, key) =>
      current && typeof current === "object"
        ? (current as Record<string, unknown>)[key]
        : undefined,
    value,
  );
}

function compareJson(
  actual: unknown,
  operator: "EQ" | "NE" | "IN" | "GTE" | "GT" | "LTE" | "LT",
  expected: LoyaltyJsonValue,
): boolean {
  if (operator === "EQ") return canonicalHash(actual) === canonicalHash(expected);
  if (operator === "NE") return canonicalHash(actual) !== canonicalHash(expected);
  if (operator === "IN")
    return (
      Array.isArray(expected) &&
      expected.some((item) => canonicalHash(item) === canonicalHash(actual))
    );
  const left = comparable(actual);
  const right = comparable(expected);
  if (left === null || right === null || typeof left !== typeof right) return false;
  if (typeof left === "bigint" && typeof right === "bigint") {
    return compareResult(left === right ? 0 : left > right ? 1 : -1, operator);
  }
  if (typeof left === "number" && typeof right === "number") {
    return compareResult(left === right ? 0 : left > right ? 1 : -1, operator);
  }
  if (typeof left === "string" && typeof right === "string") {
    return compareResult(left.localeCompare(right), operator);
  }
  return false;
}

function compareResult(comparison: number, operator: "GTE" | "GT" | "LTE" | "LT"): boolean {
  if (operator === "GT") return comparison > 0;
  if (operator === "GTE") return comparison >= 0;
  if (operator === "LT") return comparison < 0;
  return comparison <= 0;
}

function comparable(value: unknown): string | number | bigint | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return DECIMAL.test(value) ? BigInt(value) : value;
  return null;
}

export type TierMetrics = Readonly<Record<string, bigint>>;

export function evaluateTierExpression(
  expression: LoyaltyTierMetricExpressionV1,
  metrics: TierMetrics,
): boolean {
  switch (expression.type) {
    case "ALL":
      return expression.expressions.every((item) => evaluateTierExpression(item, metrics));
    case "ANY":
      return expression.expressions.some((item) => evaluateTierExpression(item, metrics));
    case "NOT":
      return !evaluateTierExpression(expression.expression, metrics);
    case "METRIC": {
      const key =
        expression.metric === "CUSTOM"
          ? `CUSTOM:${expression.customMetricCode ?? ""}:${expression.currencyCode ?? ""}`
          : `${expression.metric}:${expression.currencyCode ?? ""}`;
      const actual = metrics[key] ?? 0n;
      const threshold = parsePoints(expression.threshold, "tier threshold");
      return expression.operator === "GT" ? actual > threshold : actual >= threshold;
    }
  }
}

export function addDays(value: string, days: number): string {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString();
}

export function addSeconds(value: string, seconds: number): string {
  return new Date(Date.parse(value) + seconds * 1_000).toISOString();
}
