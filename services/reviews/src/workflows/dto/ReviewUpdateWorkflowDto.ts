import type { UserError } from "../../kernel/BaseScript.js";
import type {
  ReviewContentAuthorUpdateInput,
  ReviewContentModerationInput,
  ReviewContentPublicationSyncInput,
  ReviewContentSourceUpdateInput,
  ReviewContentTextUpdateInput,
  ReviewContentTranslationSyncInput,
  ReviewIncentiveUpdateInput,
  ReviewMediaSyncItemInput,
  ReviewRatingUpdateInput,
  ReviewReplyCreateOperationInput,
  ReviewReplyDeleteOperationInput,
  ReviewReplyUpdateOperationInput,
  ReviewSubjectUpdateInput,
  ReviewVerificationUpdateInput,
} from "../../resolvers/admin/generated/types.js";
import type { ReviewsMutationWorkflowContext } from "./ReviewsMutationWorkflowDto.js";

export interface ReviewUpdateOperationMeta {
  fieldPrefix: string[];
}

export type ReviewUpdateOperation =
  | {
      type: "contentUpdate";
      params: ReviewContentTextUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "contentAuthorUpdate";
      params: ReviewContentAuthorUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "contentSourceUpdate";
      params: ReviewContentSourceUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "contentModerationUpdate";
      params: ReviewContentModerationInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "contentTranslationsSync";
      params: { items: ReviewContentTranslationSyncInput[] };
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "contentPublicationsSync";
      params: { items: ReviewContentPublicationSyncInput[] };
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewSubjectUpdate";
      params: ReviewSubjectUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewRatingUpdate";
      params: ReviewRatingUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewVerificationUpdate";
      params: ReviewVerificationUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewIncentiveUpdate";
      params: ReviewIncentiveUpdateInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewMediaSync";
      params: { items: ReviewMediaSyncItemInput[] };
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewReplyCreate";
      params: ReviewReplyCreateOperationInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewReplyUpdate";
      params: ReviewReplyUpdateOperationInput;
      meta: ReviewUpdateOperationMeta;
    }
  | {
      type: "reviewReplyDelete";
      params: ReviewReplyDeleteOperationInput;
      meta: ReviewUpdateOperationMeta;
    };

export interface ReviewUpdateWorkflowInput {
  reviewId: string;

  operations: ReviewUpdateOperation[];
  context: ReviewsMutationWorkflowContext;
}

export interface ReviewUpdateOperationResult {
  type: ReviewUpdateOperation["type"];
  applied: boolean;
  clientMutationId?: string;
  entityId?: string;
  errors: UserError[];
}

export interface ReviewUpdateWorkflowResult {
  review: { id: string } | null;
  operationResults: ReviewUpdateOperationResult[];
  userErrors: UserError[];
}
