import type {
  ReviewContentDeleteInput,
  ReviewContentExternalReferenceDeleteInput,
  ReviewRatingCriterionDeleteInput,
} from "../../resolvers/admin/generated/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  CreateWorkflowInput,
} from "../create/types.js";

export type RatingCriterionDeleteParams = ReviewRatingCriterionDeleteInput;
export type ReviewDeleteParams = ReviewContentDeleteInput;
export type ProductQuestionDeleteParams = ReviewContentDeleteInput;
export type ContentExternalReferenceDeleteParams =
  ReviewContentExternalReferenceDeleteInput;

interface DeleteResult {
  userErrors: UserError[];
}

export interface RatingCriterionDeleteResult extends DeleteResult {
  deletedCriterionId?: string;
  permanent?: boolean;
}

export interface ReviewDeleteResult extends DeleteResult {
  deletedReviewId?: string;
  productId?: string;
  permanent?: boolean;
}

export interface ProductQuestionDeleteResult extends DeleteResult {
  deletedProductQuestionId?: string;
  productId?: string;
  permanent?: boolean;
}

export interface ContentExternalReferenceDeleteResult extends DeleteResult {
  deletedExternalReferenceId?: string;
  contentId?: string;
  permanent?: boolean;
}

export type RatingCriterionDeleteWorkflowInput =
  CreateWorkflowInput<RatingCriterionDeleteParams>;
export type ReviewDeleteWorkflowInput = CreateWorkflowInput<ReviewDeleteParams>;
export type ProductQuestionDeleteWorkflowInput =
  CreateWorkflowInput<ProductQuestionDeleteParams>;
export type ContentExternalReferenceDeleteWorkflowInput =
  CreateWorkflowInput<ContentExternalReferenceDeleteParams>;
