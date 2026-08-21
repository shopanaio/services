import type {
  ManualRecommendationAction,
  ProductRecommendationSource,
  RecommendationPlacement,
  RecommendationSourceBreakdownV1,
  RecommendationStrategy,
} from "../models/recommendationRuntime.js";

export interface RecommendationCandidate {
  targetProductId: string;
  manualAction: "PIN" | "BOOST" | null;
  manualPosition: number | null;
  manualBoost: string | null;
  fbtSourceScore: string | null;
  popularityScore: string | null;
  primarySource: ProductRecommendationSource;
  sourceBreakdown: RecommendationSourceBreakdownV1;
}

export interface RankedRecommendationCandidate extends RecommendationCandidate {
  rank: number;
  score: string;
  pinned: boolean;
  features: {
    version: 1;
    manualBoost: string | null;
    fbtNormalized: string;
    popularity: string;
  };
}

export interface RecommendationPolicyInput {
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
  minimumResults: number;
  maximumResults: number;
  fallbackChain: string[];
}

export interface ManualRecommendationInput {
  anchorProductId: string;
  targetProductId: string;
  placement: RecommendationPlacement;
  action: ManualRecommendationAction;
  position: number | null;
  boost: string | null;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface RecommendationBuildInputs {
  asOf: string;
  policyId: string;
  calculationRunId: string | null;
  sourceIngestionWatermark: string | null;
  manualConfigurationHash: string;
  requestedGeneration: string;
  triggerKey: string;
  modelVersion: string;
}

export interface RecommendationRequestGeneration {
  requestId: string;
  anchorProductId: string;
  placement: RecommendationPlacement;
  generation: string;
  triggerKey: string;
}

export interface RecommendationPageKey {
  anchorProductId: string;
  placement: RecommendationPlacement;
  first: number;
  after: string | null;
}

export interface RecommendationPageRow {
  targetProductId: string;
  primarySource: ProductRecommendationSource;
  rank: number;
  cursor: string;
}

export interface RecommendationPageResult {
  rows: RecommendationPageRow[];
  hasNextPage: boolean;
  totalCount: number;
  snapshotId: string | null;
}
