import type {
  ContentExternalReferenceCreateParams,
  ContentExternalReferenceCreateResult,
  ModerationCaseCreateParams,
  ModerationCaseCreateResult,
  ProductQuestionCreateParams,
  ProductQuestionCreateResult,
  RatingCriterionCreateParams,
  RatingCriterionCreateResult,
  ReviewCreateParams,
  ReviewCreateResult,
  ReviewRequestCreateParams,
  ReviewRequestCreateResult,
} from "../../scripts/create/index.js";
import type {
  ContentExternalReferenceDeleteParams,
  ContentExternalReferenceDeleteResult,
  ProductQuestionDeleteParams,
  ProductQuestionDeleteResult,
  RatingCriterionDeleteParams,
  RatingCriterionDeleteResult,
  ReviewDeleteParams,
  ReviewDeleteResult,
} from "../../scripts/delete/index.js";
import type {
  ContentExternalReferenceUpdateParams,
  ContentExternalReferenceUpdateResult,
  ContentRedactParams,
  ContentRedactResult,
  ContentReportUpdateParams,
  ContentReportUpdateResult,
  ContentRevisionRestoreParams,
  ContentRevisionRestoreResult,
  ModerationCaseUpdateParams,
  ModerationCaseUpdateResult,
  QuestionSubscriptionUpdateParams,
  QuestionSubscriptionUpdateResult,
  ReviewsUpdateOperationResult,
  ReviewsUpdateOperationType,
  ReviewRequestUpdateParams,
  ReviewRequestUpdateResult,
  StoreConfigurationUpdateParams,
  StoreConfigurationUpdateResult,
} from "../../scripts/update/index.js";

export interface ReviewsMutationWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale?: string;
  requestId: string;
}

export interface RatingCriterionCreateWorkflowInput {
  params: RatingCriterionCreateParams;
  context: ReviewsMutationWorkflowContext;
}
export type RatingCriterionCreateWorkflowResult = RatingCriterionCreateResult;

export interface ReviewCreateWorkflowInput {
  params: ReviewCreateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ReviewCreateWorkflowResult = ReviewCreateResult;

export interface ProductQuestionCreateWorkflowInput {
  params: ProductQuestionCreateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ProductQuestionCreateWorkflowResult = ProductQuestionCreateResult;

export interface ReviewRequestCreateWorkflowInput {
  params: ReviewRequestCreateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ReviewRequestCreateWorkflowResult = ReviewRequestCreateResult;

export interface ModerationCaseCreateWorkflowInput {
  params: ModerationCaseCreateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ModerationCaseCreateWorkflowResult = ModerationCaseCreateResult;

export interface ContentExternalReferenceCreateWorkflowInput {
  params: ContentExternalReferenceCreateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ContentExternalReferenceCreateWorkflowResult = ContentExternalReferenceCreateResult;

export interface RatingCriterionDeleteWorkflowInput {
  params: RatingCriterionDeleteParams;
  context: ReviewsMutationWorkflowContext;
}
export type RatingCriterionDeleteWorkflowResult = RatingCriterionDeleteResult;

export interface ReviewDeleteWorkflowInput {
  params: ReviewDeleteParams;
  context: ReviewsMutationWorkflowContext;
}
export type ReviewDeleteWorkflowResult = ReviewDeleteResult;

export interface ProductQuestionDeleteWorkflowInput {
  params: ProductQuestionDeleteParams;
  context: ReviewsMutationWorkflowContext;
}
export type ProductQuestionDeleteWorkflowResult = ProductQuestionDeleteResult;

export interface ContentExternalReferenceDeleteWorkflowInput {
  params: ContentExternalReferenceDeleteParams;
  context: ReviewsMutationWorkflowContext;
}
export type ContentExternalReferenceDeleteWorkflowResult = ContentExternalReferenceDeleteResult;

export type SingleOperationWorkflowResult<TResult> = TResult & {
  operationResults: ReviewsUpdateOperationResult[];
};

export interface StoreConfigurationUpdateWorkflowInput {
  params: StoreConfigurationUpdateParams;
  context: ReviewsMutationWorkflowContext;
}
export type StoreConfigurationUpdateWorkflowResult =
  SingleOperationWorkflowResult<StoreConfigurationUpdateResult>;

export interface QuestionSubscriptionUpdateWorkflowInput {
  params: QuestionSubscriptionUpdateParams;
  context: ReviewsMutationWorkflowContext;
}
export type QuestionSubscriptionUpdateWorkflowResult =
  SingleOperationWorkflowResult<QuestionSubscriptionUpdateResult>;

export interface ContentRedactWorkflowInput {
  params: ContentRedactParams;
  context: ReviewsMutationWorkflowContext;
}
export type ContentRedactWorkflowResult = SingleOperationWorkflowResult<ContentRedactResult>;

export interface ContentRevisionRestoreWorkflowInput {
  params: ContentRevisionRestoreParams;
  context: ReviewsMutationWorkflowContext;
}
export type ContentRevisionRestoreWorkflowResult =
  SingleOperationWorkflowResult<ContentRevisionRestoreResult>;

export interface ReviewRequestUpdateWorkflowInput {
  params: ReviewRequestUpdateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ReviewRequestUpdateWorkflowResult =
  SingleOperationWorkflowResult<ReviewRequestUpdateResult>;

export interface ContentReportUpdateWorkflowInput {
  params: ContentReportUpdateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ContentReportUpdateWorkflowResult =
  SingleOperationWorkflowResult<ContentReportUpdateResult>;

export interface ModerationCaseUpdateWorkflowInput {
  params: ModerationCaseUpdateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ModerationCaseUpdateWorkflowResult =
  SingleOperationWorkflowResult<ModerationCaseUpdateResult>;

export interface ContentExternalReferenceUpdateWorkflowInput {
  params: ContentExternalReferenceUpdateParams;
  context: ReviewsMutationWorkflowContext;
}
export type ContentExternalReferenceUpdateWorkflowResult =
  SingleOperationWorkflowResult<ContentExternalReferenceUpdateResult>;

export type { ReviewsUpdateOperationResult, ReviewsUpdateOperationType };
