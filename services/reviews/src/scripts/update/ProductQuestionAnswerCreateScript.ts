import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ProductQuestionUpdateOperation } from "../../workflows/dto/index.js";
import { mapContentCreate } from "../create/content.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface ProductQuestionAnswerCreateParams {
  productQuestionId: string;
  operation: Extract<ProductQuestionUpdateOperation, { type: "productQuestionAnswerCreate" }>;
}

export class ProductQuestionAnswerCreateScript extends BaseScript<
  ProductQuestionAnswerCreateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(params: ProductQuestionAnswerCreateParams): Promise<ReviewSectionResult> {
    const question = await this.repository.productQuestion.findById(params.productQuestionId);
    if (!question) {
      return sectionErrors([{ message: "Product question not found", code: "NOT_FOUND" }]);
    }

    const input = params.operation.params;
    const mapped = mapContentCreate(
      input.content,
      "QUESTION_ANSWER",
      this.context.hasUser ? this.context.user.id : undefined,
    );
    const errors = [...mapped.errors];
    if (input.sortIndex != null && input.sortIndex < 0) {
      errors.push({
        message: "Answer sort index cannot be negative",
        code: "INVALID_SORT_INDEX",
        field: ["sortIndex"],
      });
    }
    if (errors.length > 0 || !mapped.values) return sectionErrors(errors);

    const created = await this.repository.productQuestionAnswer.create({
      content: mapped.values,
      answer: {
        questionId: params.productQuestionId,
        isOfficial: input.isOfficial ?? false,
        isAccepted: input.isAccepted ?? false,
        sortIndex: input.sortIndex ?? 0,
      },
    });
    return sectionSuccess(true, created.answer.id);
  }

  protected handleError(error: unknown): ReviewSectionResult {
    if (isUniqueViolation(error, "content_item_store_idempotency_unique")) {
      return sectionErrors([
        {
          message: "Content with this idempotency key already exists",
          code: "DUPLICATE_IDEMPOTENCY_KEY",
          field: ["content", "source", "idempotencyKey"],
        },
      ]);
    }
    if (isUniqueViolation(error, "question_answer_one_accepted_unique")) {
      return acceptedAnswerExistsError();
    }
    return internalSectionError();
  }
}

export function acceptedAnswerExistsError(): ReviewSectionResult {
  return sectionErrors([
    {
      message: "A product question may only have one accepted answer",
      code: "ACCEPTED_ANSWER_EXISTS",
      field: ["isAccepted"],
    },
  ]);
}
