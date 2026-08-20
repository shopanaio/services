import type {
  LoyaltyCatalogSelector,
  LoyaltyEligibleSpendBasis,
  LoyaltyModifierStackingMode,
  LoyaltyProgramEligibilityV1,
  LoyaltyProgramEligibilityType,
  LoyaltyProgramRulesV1,
  LoyaltySegmentMatchMode,
} from "./types.js";

export type LoyaltyProgramIneligibilityCode =
  "CHANNEL_NOT_ELIGIBLE" | "REQUIRED_SEGMENT_MISSING" | "EXCLUDED_SEGMENT_MATCHED";

export type LoyaltyProgramEligibilityDecision =
  | Readonly<{ eligible: true }>
  | Readonly<{
      eligible: false;
      code: LoyaltyProgramIneligibilityCode;
    }>;

export interface LoyaltyProgramEligibilityContext {
  channelCode: string;
  segmentIds: readonly string[];
}

/**
 * Canonical eligibility evaluator shared by earning and redemption flows.
 * Exclusions take precedence over positive audience matches.
 */
export function evaluateLoyaltyProgramEligibility(
  eligibility: LoyaltyProgramEligibilityV1,
  context: LoyaltyProgramEligibilityContext,
): LoyaltyProgramEligibilityDecision {
  if (!eligibility.channelCodes.includes(context.channelCode)) {
    return { eligible: false, code: "CHANNEL_NOT_ELIGIBLE" };
  }

  const customerSegments = new Set(context.segmentIds);
  if (eligibility.excludedSegmentIds.some((segmentId) => customerSegments.has(segmentId))) {
    return { eligible: false, code: "EXCLUDED_SEGMENT_MATCHED" };
  }

  if (eligibility.type === "ALL") {
    return { eligible: true };
  }

  const matches =
    eligibility.segmentMatchMode === "ALL"
      ? eligibility.segmentIds.every((segmentId) => customerSegments.has(segmentId))
      : eligibility.segmentIds.some((segmentId) => customerSegments.has(segmentId));

  return matches ? { eligible: true } : { eligible: false, code: "REQUIRED_SEGMENT_MISSING" };
}

export type LoyaltyProgramRulesValidationCode =
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "CHANNEL_REQUIRED"
  | "DUPLICATE_CHANNEL"
  | "INVALID_ALL_ELIGIBILITY"
  | "INVALID_SEGMENT_MATCH_MODE"
  | "SEGMENT_REQUIRED"
  | "DUPLICATE_SEGMENT"
  | "SEGMENT_INCLUDE_EXCLUDE_CONFLICT"
  | "INVALID_SELECTOR"
  | "DUPLICATE_MODIFIER"
  | "INVALID_MODIFIER"
  | "INVALID_MODIFIER_SCHEDULE";

export interface LoyaltyProgramRulesValidationIssue {
  code: LoyaltyProgramRulesValidationCode;
  message: string;
  field: readonly (string | number)[];
}

/** Input shape accepted while constructing a canonical V1 policy. */
export interface LoyaltyProgramRulesValidationInputV1 {
  schemaVersion: number;
  eligibility: Readonly<{
    type: LoyaltyProgramEligibilityType;
    channelCodes: readonly string[];
    segmentMatchMode?: LoyaltySegmentMatchMode | null;
    segmentIds: readonly string[];
    excludedSegmentIds: readonly string[];
  }>;
  earning: Readonly<{
    eligibleSpendBasis: LoyaltyEligibleSpendBasis;
    excludedSelectors: readonly LoyaltyCatalogSelectorValidationInput[];
    modifierStackingMode: LoyaltyModifierStackingMode;
    modifiers: readonly LoyaltyEarningModifierValidationInputV1[];
  }>;
}

export interface LoyaltyCatalogSelectorValidationInput {
  type: LoyaltyCatalogSelector["type"];
  ids: readonly string[];
}

export interface LoyaltyEarningModifierValidationInputV1 {
  id: string;
  title: string;
  priority: number;
  multiplierBps: number;
  selector: LoyaltyCatalogSelectorValidationInput;
  segmentIds: readonly string[];
  startsAt: string | null;
  endsAt: string | null;
}

export type LoyaltyProgramRulesValidationResultV1 =
  | Readonly<{
      valid: true;
      rules: LoyaltyProgramRulesV1;
    }>
  | Readonly<{
      valid: false;
      issues: readonly LoyaltyProgramRulesValidationIssue[];
    }>;

/** Validates input and returns the canonical JSON policy persisted by Loyalty. */
export function createLoyaltyProgramRulesV1(
  input: LoyaltyProgramRulesValidationInputV1,
): LoyaltyProgramRulesValidationResultV1 {
  const issues = validateLoyaltyProgramRulesV1(input);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const eligibility: LoyaltyProgramEligibilityV1 =
    input.eligibility.type === "ALL"
      ? {
          type: "ALL",
          channelCodes: [...input.eligibility.channelCodes],
          segmentIds: [],
          excludedSegmentIds: [...input.eligibility.excludedSegmentIds],
        }
      : {
          type: "SEGMENTS",
          channelCodes: [...input.eligibility.channelCodes],
          segmentMatchMode: input.eligibility.segmentMatchMode!,
          segmentIds: [...input.eligibility.segmentIds],
          excludedSegmentIds: [...input.eligibility.excludedSegmentIds],
        };

  return {
    valid: true,
    rules: {
      schemaVersion: 1,
      eligibility,
      earning: {
        eligibleSpendBasis: input.earning.eligibleSpendBasis,
        excludedSelectors: input.earning.excludedSelectors.map(toSelector),
        modifierStackingMode: input.earning.modifierStackingMode,
        modifiers: input.earning.modifiers.map((modifier) => ({
          id: modifier.id,
          title: modifier.title,
          priority: modifier.priority,
          multiplierBps: modifier.multiplierBps,
          selector: toSelector(modifier.selector),
          segmentIds: [...modifier.segmentIds],
          startsAt: modifier.startsAt,
          endsAt: modifier.endsAt,
        })),
      },
    },
  };
}

/** Semantic validation required before a program version can be published. */
export function validateLoyaltyProgramRulesV1(
  rules: LoyaltyProgramRulesValidationInputV1,
): readonly LoyaltyProgramRulesValidationIssue[] {
  const issues: LoyaltyProgramRulesValidationIssue[] = [];
  const eligibility = rules.eligibility;

  if (rules.schemaVersion !== 1) {
    issue(
      issues,
      "UNSUPPORTED_SCHEMA_VERSION",
      "Only loyalty program rules schema version 1 is supported",
      ["schemaVersion"],
    );
  }

  if (eligibility.channelCodes.length === 0) {
    issue(issues, "CHANNEL_REQUIRED", "At least one eligible channel is required", [
      "eligibility",
      "channelCodes",
    ]);
  }
  validateUniqueNonBlank(
    eligibility.channelCodes,
    "DUPLICATE_CHANNEL",
    "Eligible channels must be non-blank and unique",
    ["eligibility", "channelCodes"],
    issues,
  );
  validateUniqueNonBlank(
    eligibility.segmentIds,
    "DUPLICATE_SEGMENT",
    "Included segments must be non-blank and unique",
    ["eligibility", "segmentIds"],
    issues,
  );
  validateUniqueNonBlank(
    eligibility.excludedSegmentIds,
    "DUPLICATE_SEGMENT",
    "Excluded segments must be non-blank and unique",
    ["eligibility", "excludedSegmentIds"],
    issues,
  );

  if (
    eligibility.type === "ALL" &&
    (eligibility.segmentIds.length > 0 ||
      (eligibility.segmentMatchMode !== undefined && eligibility.segmentMatchMode !== null))
  ) {
    issue(
      issues,
      "INVALID_ALL_ELIGIBILITY",
      "ALL eligibility cannot contain included segments or a segment match mode",
      ["eligibility"],
    );
  }
  if (eligibility.type === "SEGMENTS") {
    if (eligibility.segmentMatchMode == null) {
      issue(
        issues,
        "INVALID_SEGMENT_MATCH_MODE",
        "SEGMENTS eligibility requires a segment match mode",
        ["eligibility", "segmentMatchMode"],
      );
    }
    if (eligibility.segmentIds.length === 0) {
      issue(
        issues,
        "SEGMENT_REQUIRED",
        "SEGMENTS eligibility requires at least one included segment",
        ["eligibility", "segmentIds"],
      );
    }
  }

  const excludedSegments = new Set(eligibility.excludedSegmentIds);
  if (eligibility.segmentIds.some((segmentId) => excludedSegments.has(segmentId))) {
    issue(
      issues,
      "SEGMENT_INCLUDE_EXCLUDE_CONFLICT",
      "A segment cannot be both included and excluded",
      ["eligibility"],
    );
  }

  rules.earning.excludedSelectors.forEach((selector, index) => {
    validateSelector(selector, ["earning", "excludedSelectors", index], issues);
  });

  const modifierIds = new Set<string>();
  rules.earning.modifiers.forEach((modifier, index) => {
    const path = ["earning", "modifiers", index] as const;
    if (modifierIds.has(modifier.id)) {
      issue(issues, "DUPLICATE_MODIFIER", "Modifier IDs must be unique", [...path, "id"]);
    }
    modifierIds.add(modifier.id);

    if (
      modifier.id.trim().length === 0 ||
      modifier.title.trim().length === 0 ||
      !Number.isSafeInteger(modifier.priority) ||
      !Number.isSafeInteger(modifier.multiplierBps) ||
      modifier.multiplierBps <= 0
    ) {
      issue(
        issues,
        "INVALID_MODIFIER",
        "A modifier requires a non-blank ID and title, an integer priority, and a positive integer multiplier",
        path,
      );
    }

    validateUniqueNonBlank(
      modifier.segmentIds,
      "DUPLICATE_SEGMENT",
      "Modifier segments must be non-blank and unique",
      [...path, "segmentIds"],
      issues,
    );
    validateSelector(modifier.selector, [...path, "selector"], issues);

    if (!validSchedule(modifier.startsAt, modifier.endsAt)) {
      issue(
        issues,
        "INVALID_MODIFIER_SCHEDULE",
        "Modifier dates must be valid and endsAt must be later than startsAt",
        path,
      );
    }
  });

  return issues;
}

function validateSelector(
  selector: LoyaltyCatalogSelectorValidationInput,
  path: readonly (string | number)[],
  issues: LoyaltyProgramRulesValidationIssue[],
): void {
  const hasDuplicatesOrBlanks =
    new Set(selector.ids).size !== selector.ids.length ||
    selector.ids.some((id) => id.trim().length === 0);
  if (
    hasDuplicatesOrBlanks ||
    (selector.type === "ALL" ? selector.ids.length !== 0 : selector.ids.length === 0)
  ) {
    issue(
      issues,
      "INVALID_SELECTOR",
      "ALL selectors must be empty; specific selectors require unique, non-blank IDs",
      path,
    );
  }
}

function toSelector(selector: LoyaltyCatalogSelectorValidationInput): LoyaltyCatalogSelector {
  return selector.type === "ALL"
    ? { type: "ALL", ids: [] }
    : { type: selector.type, ids: [...selector.ids] };
}

function validateUniqueNonBlank(
  values: readonly string[],
  code: LoyaltyProgramRulesValidationCode,
  message: string,
  field: readonly (string | number)[],
  issues: LoyaltyProgramRulesValidationIssue[],
): void {
  if (new Set(values).size !== values.length || values.some((value) => value.trim().length === 0)) {
    issue(issues, code, message, field);
  }
}

function validSchedule(startsAt: string | null, endsAt: string | null): boolean {
  const start = startsAt === null ? null : Date.parse(startsAt);
  const end = endsAt === null ? null : Date.parse(endsAt);
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) {
    return false;
  }
  return start === null || end === null || end > start;
}

function issue(
  issues: LoyaltyProgramRulesValidationIssue[],
  code: LoyaltyProgramRulesValidationCode,
  message: string,
  field: readonly (string | number)[],
): void {
  issues.push({ code, message, field });
}
