import type {
  ProductQuestionCreateInput,
  ReviewContentExternalReferenceCreateInput,
  ReviewCreateInput,
  ReviewModerationCaseCreateInput,
  ReviewRatingCriterionCreateInput,
  ReviewRequestCreateInput,
} from "../../resolvers/admin/generated/types.js";
import type { UserError } from "../../kernel/BaseScript.js";

export type RatingCriterionCreateParams = ReviewRatingCriterionCreateInput;
export type ReviewCreateParams = ReviewCreateInput;
export type ProductQuestionCreateParams = ProductQuestionCreateInput;
export type ReviewRequestCreateParams = ReviewRequestCreateInput;
export type ModerationCaseCreateParams = ReviewModerationCaseCreateInput;
export type ContentExternalReferenceCreateParams =
  ReviewContentExternalReferenceCreateInput;

export interface RatingCriterionCreateResult {
  criterion?: { id: string };
  userErrors: UserError[];
}

export interface ReviewCreateResult {
  review?: { id: string; productId: string };
  userErrors: UserError[];
}

export interface ProductQuestionCreateResult {
  productQuestion?: { id: string; productId: string };
  userErrors: UserError[];
}

export interface ReviewRequestCreateResult {
  reviewRequest?: { id: string; customerId: string; productId: string };
  userErrors: UserError[];
}

export interface ModerationCaseCreateResult {
  moderationCase?: { id: string; contentId: string };
  userErrors: UserError[];
}

export interface ContentExternalReferenceCreateResult {
  externalReference?: { id: string; contentId: string };
  userErrors: UserError[];
}

export interface ReviewsMutationWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale?: string;
  requestId: string;
}

export interface CreateWorkflowInput<TParams> {
  params: TParams;
  context: ReviewsMutationWorkflowContext;
}

export type RatingCriterionCreateWorkflowInput =
  CreateWorkflowInput<RatingCriterionCreateParams>;
export type ReviewCreateWorkflowInput = CreateWorkflowInput<ReviewCreateParams>;
export type ProductQuestionCreateWorkflowInput =
  CreateWorkflowInput<ProductQuestionCreateParams>;
export type ReviewRequestCreateWorkflowInput =
  CreateWorkflowInput<ReviewRequestCreateParams>;
export type ModerationCaseCreateWorkflowInput =
  CreateWorkflowInput<ModerationCaseCreateParams>;
export type ContentExternalReferenceCreateWorkflowInput =
  CreateWorkflowInput<ContentExternalReferenceCreateParams>;
