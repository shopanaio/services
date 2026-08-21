import type { UserError } from "../../kernel/BaseScript.js";
import type {
  ReviewRatingCriterionApplicabilityInput,
  ReviewRatingCriterionAssignmentInput,
  ReviewRatingCriterionDefinitionInput,
  ReviewRatingCriterionTranslationInput,
} from "../../resolvers/admin/generated/types.js";
import type { ReviewsUpdateOperationResult } from "../../scripts/update/index.js";
import type { ReviewsMutationWorkflowContext } from "./ReviewsMutationWorkflowDto.js";

export interface RatingCriterionUpdateOperationMeta {
  fieldPrefix: string[];
}

export type RatingCriterionUpdateOperation =
  | {
      type: "ratingCriterionDefinitionUpdate";
      params: ReviewRatingCriterionDefinitionInput;
      meta: RatingCriterionUpdateOperationMeta;
    }
  | {
      type: "ratingCriterionApplicabilityUpdate";
      params: ReviewRatingCriterionApplicabilityInput;
      meta: RatingCriterionUpdateOperationMeta;
    }
  | {
      type: "ratingCriterionTranslationsSync";
      params: { items: ReviewRatingCriterionTranslationInput[] };
      meta: RatingCriterionUpdateOperationMeta;
    }
  | {
      type: "ratingCriterionAssignmentsSync";
      params: { items: ReviewRatingCriterionAssignmentInput[] };
      meta: RatingCriterionUpdateOperationMeta;
    };

export interface RatingCriterionUpdateWorkflowInput {
  criterionId: string;
  operations: RatingCriterionUpdateOperation[];
  context: ReviewsMutationWorkflowContext;
}

export interface RatingCriterionUpdateWorkflowResult {
  criterion: { id: string } | null;
  operationResults: ReviewsUpdateOperationResult[];
  userErrors: UserError[];
}
