import type { UserError } from "../../kernel/BaseScript.js";
import type {
  ProductQuestionAnswerCreateOperationInput,
  ProductQuestionAnswerDeleteOperationInput,
  ProductQuestionAnswerUpdateOperationInput,
  ProductQuestionSubjectUpdateInput,
  ReviewContentAuthorUpdateInput,
  ReviewContentModerationInput,
  ReviewContentPublicationSyncInput,
  ReviewContentSourceUpdateInput,
  ReviewContentTextUpdateInput,
  ReviewContentTranslationSyncInput,
} from "../../resolvers/admin/generated/types.js";
import type { ReviewsMutationWorkflowContext } from "./ReviewsMutationWorkflowDto.js";

export interface ProductQuestionUpdateOperationMeta {
  fieldPrefix: string[];
}

export type ProductQuestionUpdateOperation =
  | {
      type: "contentUpdate";
      params: ReviewContentTextUpdateInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "contentAuthorUpdate";
      params: ReviewContentAuthorUpdateInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "contentSourceUpdate";
      params: ReviewContentSourceUpdateInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "contentModerationUpdate";
      params: ReviewContentModerationInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "contentTranslationsSync";
      params: { items: ReviewContentTranslationSyncInput[] };
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "contentPublicationsSync";
      params: { items: ReviewContentPublicationSyncInput[] };
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "productQuestionUpdate";
      params: ProductQuestionSubjectUpdateInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "productQuestionAnswerCreate";
      params: ProductQuestionAnswerCreateOperationInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "productQuestionAnswerUpdate";
      params: ProductQuestionAnswerUpdateOperationInput;
      meta: ProductQuestionUpdateOperationMeta;
    }
  | {
      type: "productQuestionAnswerDelete";
      params: ProductQuestionAnswerDeleteOperationInput;
      meta: ProductQuestionUpdateOperationMeta;
    };

export interface ProductQuestionUpdateWorkflowInput {
  productQuestionId: string;
  expectedRevision: number;
  operations: ProductQuestionUpdateOperation[];
  context: ReviewsMutationWorkflowContext;
}

export interface ProductQuestionUpdateOperationResult {
  type: ProductQuestionUpdateOperation["type"];
  applied: boolean;
  clientMutationId?: string;
  entityId?: string;
  errors: UserError[];
}

export interface ProductQuestionUpdateWorkflowResult {
  productQuestion: { id: string; revision: number } | null;
  operationResults: ProductQuestionUpdateOperationResult[];
  userErrors: UserError[];
}
