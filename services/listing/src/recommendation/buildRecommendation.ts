import { GLOBAL_RECOMMENDATION_CANDIDATE_LIMIT, recommendationSourceLimit } from "./constants.js";
import { RecommendationIntegrityError } from "./errors.js";
import { rankRecommendationCandidates } from "./rankRulesV1.js";
import type {
  ManualProductRecommendation,
  RecommendationPlacementPolicy,
} from "../repositories/models/recommendationRuntime.js";
import type {
  RankedRecommendationCandidate,
  RecommendationCandidate,
} from "../repositories/recommendation/types.js";

export type RecommendationExcludedReason =
  "STALE" | "UNPUBLISHED" | "UNAVAILABLE" | "EXCLUDED" | "INSUFFICIENT_SUPPORT" | "LIMIT_EXCEEDED";

export interface RecommendationBuildResult {
  candidates: RankedRecommendationCandidate[];
  excluded: Array<{ targetProductId: string; reason: RecommendationExcludedReason }>;
}

export async function buildRecommendation(input: {
  anchorProductId: string;
  policy: RecommendationPlacementPolicy;
  manualRows: readonly ManualProductRecommendation[];
  loadFbt: (limit: number) => Promise<RecommendationCandidate[]>;
  loadCategoryPopularity: (limit: number) => Promise<RecommendationCandidate[]>;
  loadStorePopularity: (limit: number) => Promise<RecommendationCandidate[]>;
  eligibility: (
    ids: readonly string[],
  ) => Promise<Map<string, "ELIGIBLE" | "UNPUBLISHED" | "UNAVAILABLE" | "STALE">>;
}): Promise<RecommendationBuildResult> {
  if (!input.policy.enabled) return { candidates: [], excluded: [] };
  const limit = recommendationSourceLimit(input.policy.maximumResults);
  const excluded = new Map<string, RecommendationExcludedReason>();
  const excludedIds = new Set(
    input.manualRows.filter((row) => row.action === "EXCLUDE").map((row) => row.targetProductId),
  );
  const union = new Map<string, RecommendationCandidate>();

  if (input.policy.strategy !== "AUTOMATED_ONLY") {
    const pins = input.manualRows.filter((row) => row.action === "PIN");
    const boosts = input.manualRows
      .filter((row) => row.action === "BOOST")
      .sort(
        (left, right) =>
          compareBoost(right.boost, left.boost) ||
          left.targetProductId.localeCompare(right.targetProductId),
      )
      .slice(0, limit);
    for (const row of [...pins, ...boosts]) mergeCandidate(union, manualCandidate(row));
  }
  if (input.policy.strategy !== "CURATED_ONLY") {
    for (const candidate of await input.loadFbt(limit)) mergeCandidate(union, candidate);
  }
  await filterUnion(union, excludedIds, input.eligibility, excluded);
  assertLimit(union.size);

  if (input.policy.strategy !== "CURATED_ONLY" && input.policy.minimumResults > 0) {
    for (const fallback of input.policy.fallbackChain) {
      if (union.size >= input.policy.minimumResults) break;
      const candidates =
        fallback === "category_popularity"
          ? await input.loadCategoryPopularity(limit)
          : fallback === "store_popularity"
            ? await input.loadStorePopularity(limit)
            : [];
      for (const candidate of candidates) mergeCandidate(union, candidate);
      assertLimit(union.size);
      await filterUnion(union, excludedIds, input.eligibility, excluded);
    }
  }

  const candidates = rankRecommendationCandidates({
    candidates: [...union.values()],
    placement: input.policy.placement,
    strategy: input.policy.strategy,
    maximumResults: input.policy.maximumResults,
  });
  const included = new Set(candidates.map((candidate) => candidate.targetProductId));
  for (const targetProductId of union.keys()) {
    if (!included.has(targetProductId)) excluded.set(targetProductId, "LIMIT_EXCEEDED");
  }
  return {
    candidates,
    excluded: [...excluded].map(([targetProductId, reason]) => ({ targetProductId, reason })),
  };
}

function manualCandidate(row: ManualProductRecommendation): RecommendationCandidate {
  return {
    targetProductId: row.targetProductId,
    manualAction: row.action === "EXCLUDE" ? null : row.action,
    manualPosition: row.position,
    manualBoost: row.boost,
    fbtSourceScore: null,
    popularityScore: null,
    primarySource: "MANUAL",
    sourceBreakdown: {
      version: 1,
      manual: {
        action: row.action as "PIN" | "BOOST",
        position: row.position,
        boost: row.boost,
      },
    },
  };
}

function mergeCandidate(
  union: Map<string, RecommendationCandidate>,
  incoming: RecommendationCandidate,
): void {
  const current = union.get(incoming.targetProductId);
  if (!current) {
    union.set(incoming.targetProductId, incoming);
    return;
  }
  union.set(incoming.targetProductId, {
    ...current,
    manualAction: current.manualAction ?? incoming.manualAction,
    manualPosition: current.manualPosition ?? incoming.manualPosition,
    manualBoost: current.manualBoost ?? incoming.manualBoost,
    fbtSourceScore: current.fbtSourceScore ?? incoming.fbtSourceScore,
    popularityScore: maxDecimal(current.popularityScore, incoming.popularityScore),
    primarySource: primarySource(current, incoming),
    sourceBreakdown: {
      ...incoming.sourceBreakdown,
      ...current.sourceBreakdown,
      version: 1,
    },
  });
}

function primarySource(
  current: RecommendationCandidate,
  incoming: RecommendationCandidate,
): RecommendationCandidate["primarySource"] {
  const candidates = [current, incoming];
  if (candidates.some((item) => item.manualAction)) return "MANUAL";
  if (candidates.some((item) => item.fbtSourceScore !== null)) return "FREQUENTLY_BOUGHT_TOGETHER";
  if (candidates.some((item) => item.popularityScore !== null)) return "POPULARITY";
  return "FALLBACK";
}

async function filterUnion(
  union: Map<string, RecommendationCandidate>,
  excludedIds: Set<string>,
  eligibility: (
    ids: readonly string[],
  ) => Promise<Map<string, "ELIGIBLE" | "UNPUBLISHED" | "UNAVAILABLE" | "STALE">>,
  excluded: Map<string, RecommendationExcludedReason>,
): Promise<void> {
  const states = await eligibility([...union.keys()]);
  for (const targetProductId of union.keys()) {
    if (excludedIds.has(targetProductId)) {
      union.delete(targetProductId);
      excluded.set(targetProductId, "EXCLUDED");
      continue;
    }
    const state = states.get(targetProductId) ?? "STALE";
    if (state !== "ELIGIBLE") {
      union.delete(targetProductId);
      excluded.set(targetProductId, state);
    }
  }
}

function assertLimit(size: number): void {
  if (size > GLOBAL_RECOMMENDATION_CANDIDATE_LIMIT) {
    throw new RecommendationIntegrityError(
      "CANDIDATE_LIMIT_EXCEEDED",
      "Recommendation candidate budget was exceeded",
    );
  }
}

function compareBoost(left: string | null, right: string | null): number {
  return compareDecimal(left ?? "0", right ?? "0");
}

function maxDecimal(left: string | null, right: string | null): string | null {
  if (left === null) return right;
  if (right === null) return left;
  return compareDecimal(left, right) >= 0 ? left : right;
}

function compareDecimal(left: string, right: string): number {
  const [leftWhole = "0", leftFraction = ""] = left.split(".");
  const [rightWhole = "0", rightFraction = ""] = right.split(".");
  if (leftWhole.length !== rightWhole.length) {
    return leftWhole.length < rightWhole.length ? -1 : 1;
  }
  if (leftWhole !== rightWhole) return leftWhole < rightWhole ? -1 : 1;
  const scale = Math.max(leftFraction.length, rightFraction.length);
  const normalizedLeft = leftFraction.padEnd(scale, "0");
  const normalizedRight = rightFraction.padEnd(scale, "0");
  return normalizedLeft < normalizedRight ? -1 : normalizedLeft > normalizedRight ? 1 : 0;
}
