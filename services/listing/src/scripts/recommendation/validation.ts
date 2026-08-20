import { RECOMMENDATION_FALLBACK_CODES } from "../../recommendation/constants.js";
import type {
  ManualRecommendationAction,
  RecommendationPlacement,
  RecommendationStrategy,
} from "../../repositories/models/recommendationRuntime.js";
import type { UserError } from "../../kernel/BaseScript.js";

export const uuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePolicy(input: {
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
  minimumResults: number;
  maximumResults: number;
  fallbackChain: readonly string[];
}): UserError[] {
  const errors: UserError[] = [];
  if (!Number.isSafeInteger(input.minimumResults) || input.minimumResults < 0 || input.minimumResults > 100) {
    errors.push(error("minimumResults", "INVALID_RESULT_LIMIT", "minimumResults must be from 0 to 100"));
  }
  if (!Number.isSafeInteger(input.maximumResults) || input.maximumResults < 1 || input.maximumResults > 100 || input.minimumResults > input.maximumResults) {
    errors.push(error("maximumResults", "INVALID_RESULT_LIMIT", "maximumResults must be from 1 to 100 and at least minimumResults"));
  }
  if (new Set(input.fallbackChain).size !== input.fallbackChain.length || input.fallbackChain.some((code) => !(RECOMMENDATION_FALLBACK_CODES as readonly string[]).includes(code))) {
    errors.push(error("fallbackChain", "INVALID_FALLBACK_CHAIN", "fallbackChain contains duplicates or unsupported sources"));
  }
  return errors;
}

export function validateManualValues(input: {
  anchorProductId: string;
  targetProductId: string;
  action: ManualRecommendationAction;
  position: number | null;
  boost: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maximumResults: number;
}): UserError[] {
  const errors: UserError[] = [];
  if (!uuidV7.test(input.anchorProductId) || !uuidV7.test(input.targetProductId)) {
    errors.push(error("anchorProductId", "INVALID_ID", "Product IDs must be UUIDv7 values"));
  } else if (input.anchorProductId === input.targetProductId) {
    errors.push(error("targetProductId", "SELF_REFERENCE", "A product cannot recommend itself"));
  }
  if (input.action === "PIN") {
    if (!Number.isSafeInteger(input.position) || (input.position ?? 0) < 1 || (input.position ?? 0) > input.maximumResults || input.boost !== null) {
      errors.push(error("position", "INVALID_ACTION_VALUES", "PIN requires a position inside policy maximum and no boost"));
    }
  } else if (input.action === "BOOST") {
    if (input.position !== null || input.boost === null || !validBoost(input.boost)) {
      errors.push(error("boost", "INVALID_ACTION_VALUES", "BOOST requires a decimal boost greater than 0 and at most 1000"));
    }
  } else if (input.position !== null || input.boost !== null) {
    errors.push(error("action", "INVALID_ACTION_VALUES", "EXCLUDE does not accept position or boost"));
  }
  const starts = input.startsAt === null ? null : Date.parse(input.startsAt);
  const ends = input.endsAt === null ? null : Date.parse(input.endsAt);
  if ((starts !== null && !Number.isFinite(starts)) || (ends !== null && !Number.isFinite(ends)) || (starts !== null && ends !== null && starts >= ends)) {
    errors.push(error("startsAt", "INVALID_SCHEDULE", "Schedule must be a valid half-open interval"));
  }
  return errors;
}

function validBoost(value: string): boolean {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(value)) return false;
  const [whole = "0", fraction = ""] = value.split(".");
  const scaled = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  return scaled > 0n && scaled <= 1_000_000_000n;
}

function error(field: string, code: string, message: string): UserError {
  return { message, field: ["input", field], code };
}

export function genericError(error: unknown): UserError[] {
  throw error;
}
