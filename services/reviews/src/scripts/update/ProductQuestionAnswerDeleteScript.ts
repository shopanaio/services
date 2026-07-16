import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { ProductQuestionUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface ProductQuestionAnswerDeleteParams {
  productQuestionId: string;
  operation: Extract<
    ProductQuestionUpdateOperation,
    { type: "productQuestionAnswerDelete" }
  >;
}

export class ProductQuestionAnswerDeleteScript extends BaseScript<
  ProductQuestionAnswerDeleteParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(
    params: ProductQuestionAnswerDeleteParams
  ): Promise<ReviewSectionResult> {
    const input = params.operation.params;
    const current = await this.repository.productQuestionAnswer.findById(
      input.answerId
    );
    if (!current || current.answer.questionId !== params.productQuestionId) {
      return sectionErrors([
        {
          message: "Answer not found for this product question",
          code: "NOT_FOUND",
          field: ["answerId"],
        },
      ]);
    }

    const result = await this.repository.content.delete({
      id: input.answerId,
      expectedRevision: input.expectedRevision,
      permanent: input.permanent ?? false,
    });
    if (result.status === "not_found") {
      return sectionErrors([
        { message: "Answer not found", code: "NOT_FOUND", field: ["answerId"] },
      ]);
    }
    if (result.status === "conflict") {
      return sectionErrors([
        {
          message: "Answer was modified by another user",
          code: "REVISION_CONFLICT",
          field: ["expectedRevision"],
        },
      ]);
    }
    return sectionSuccess(true, input.answerId);
  }

  protected handleError(_error: unknown): ReviewSectionResult {
    return internalSectionError();
  }
}
