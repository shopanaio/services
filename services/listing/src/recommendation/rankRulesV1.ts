import type {
  RankedRecommendationCandidate,
  RecommendationCandidate,
} from "../repositories/recommendation/types.js";
import type {
  RecommendationPlacement,
  RecommendationStrategy,
} from "../repositories/models/recommendationRuntime.js";

const SCALE = 1_000_000_000_000n;

export function rankRecommendationCandidates(input: {
  candidates: readonly RecommendationCandidate[];
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
  maximumResults: number;
}): RankedRecommendationCandidate[] {
  const enriched = input.candidates.map((candidate) =>
    scoreCandidate(candidate, input.placement, input.strategy),
  );
  const pins = enriched
    .filter((candidate) => candidate.manualAction === "PIN")
    .sort(
      (left, right) =>
        (left.manualPosition ?? Number.MAX_SAFE_INTEGER) -
          (right.manualPosition ?? Number.MAX_SAFE_INTEGER) ||
        left.targetProductId.localeCompare(right.targetProductId),
    );
  const rest = enriched
    .filter((candidate) => candidate.manualAction !== "PIN")
    .sort((left, right) => {
      if (input.strategy === "CURATED_ONLY") {
        const boost = compareDecimal(right.manualBoost ?? "0", left.manualBoost ?? "0");
        if (boost !== 0) return boost;
      }
      if (input.strategy === "CURATED_FIRST") {
        const leftManual = left.manualAction === "BOOST" ? 1 : 0;
        const rightManual = right.manualAction === "BOOST" ? 1 : 0;
        if (leftManual !== rightManual) return rightManual - leftManual;
      }
      const score = compareDecimal(right.score, left.score);
      return score || left.targetProductId.localeCompare(right.targetProductId);
    });

  const pinByPosition = new Map(pins.map((candidate) => [candidate.manualPosition!, candidate]));
  const output: RankedRecommendationCandidate[] = [];
  let next = 0;
  for (let position = 1; position <= input.maximumResults; position += 1) {
    const candidate = pinByPosition.get(position) ?? rest[next++];
    if (!candidate) continue;
    output.push({ ...candidate, rank: output.length + 1 });
  }
  return output;
}

function scoreCandidate(
  candidate: RecommendationCandidate,
  placement: RecommendationPlacement,
  strategy: RecommendationStrategy,
): Omit<RankedRecommendationCandidate, "rank"> {
  const fbt = decimal(candidate.fbtSourceScore ?? "0");
  const fbtNormalized = divide(fbt, SCALE + fbt);
  const popularity = decimal(candidate.popularityScore ?? "0");
  const manualBoost = divide(decimal(candidate.manualBoost ?? "0"), decimal("1000"));
  const automated =
    placement === "FREQUENTLY_BOUGHT_TOGETHER"
      ? add(multiply(fbtNormalized, decimal("0.90")), multiply(popularity, decimal("0.10")))
      : add(multiply(fbtNormalized, decimal("0.70")), multiply(popularity, decimal("0.30")));
  let score: bigint;
  if (candidate.manualAction === "PIN") score = 0n;
  else if (strategy === "CURATED_ONLY") score = manualBoost;
  else if (strategy === "CURATED_FIRST") {
    score = candidate.manualAction === "BOOST" ? add(automated, manualBoost) : automated;
  } else if (strategy === "BLENDED") {
    score = add(automated, multiply(manualBoost, decimal("0.50")));
  } else score = automated;

  return {
    ...candidate,
    score: format(score),
    pinned: candidate.manualAction === "PIN",
    features: {
      version: 1,
      manualBoost: candidate.manualBoost,
      fbtNormalized: format(fbtNormalized),
      popularity: format(popularity),
    },
  };
}

function decimal(value: string): bigint {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)) {
    throw new Error(`Invalid recommendation decimal: ${value}`);
  }
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(12, "0").slice(0, 12));
}

function add(left: bigint, right: bigint): bigint {
  return left + right;
}

function multiply(left: bigint, right: bigint): bigint {
  return (left * right + SCALE / 2n) / SCALE;
}

function divide(left: bigint, right: bigint): bigint {
  if (right === 0n) return 0n;
  return (left * SCALE + right / 2n) / right;
}

function format(value: bigint): string {
  const rounded = (value + 50n) / 100n;
  const whole = rounded / 10_000_000_000n;
  const fraction = (rounded % 10_000_000_000n).toString().padStart(10, "0");
  return `${whole}.${fraction}`;
}

function compareDecimal(left: string, right: string): number {
  const a = decimal(left);
  const b = decimal(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
