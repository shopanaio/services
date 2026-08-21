import type {
  ManualRecommendationAction,
  ManualProductRecommendation,
  RecommendationCalculationRun,
  RecommendationPlacement,
  RecommendationPlacementPolicy,
  RecommendationSnapshot,
  RecommendationStrategy,
} from "../../../repositories/models/recommendationRuntime.js";
import type { UserError } from "../../../kernel/BaseScript.js";

export interface RecommendationPolicyUpsertParams {
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
  minimumResults: number;
  maximumResults: number;
  fallbackChain: string[];
}

export interface RecommendationPolicyResult {
  policy?: RecommendationPlacementPolicy;
  generationTrigger?: string;
  userErrors: UserError[];
}

export interface ManualRecommendationCreateParams {
  anchorProductId: string;
  targetProductId: string;
  placement: RecommendationPlacement;
  action: ManualRecommendationAction;
  position?: number | null;
  boost?: string | null;
  enabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface ManualRecommendationUpdateParams {
  id: string;

  targetProductId?: string;
  action?: ManualRecommendationAction;
  position?: number | null;
  boost?: string | null;
  enabled?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface ManualRecommendationResult {
  recommendation?: ManualProductRecommendation;
  deletedId?: string;
  generation?: string;
  triggerKey?: string;
  anchorProductId?: string;
  placement?: RecommendationPlacement;
  userErrors: UserError[];
}

export interface RecommendationCalculationRunResult {
  run?: RecommendationCalculationRun;
  counts?: { productCount: number; pairCount: string };
  userErrors: UserError[];
}

export interface RecommendationSnapshotResult {
  snapshot?: RecommendationSnapshot;
  itemCount?: number;
  contentHash?: string;
  stale?: boolean;
  userErrors: UserError[];
}
