import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ProductQuestionAnswerPatch } from "../../repositories/question/ProductQuestionAnswerRepository.js";
import type { ProductQuestionUpdateOperation } from "../../workflows/dto/index.js";
import { mapNestedContentUpdate } from "./content.js";
import { acceptedAnswerExistsError } from "./ProductQuestionAnswerCreateScript.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface ProductQuestionAnswerUpdateParams {
  productQuestionId: string;
  operation: Extract<ProductQuestionUpdateOperation, { type: "productQuestionAnswerUpdate" }>;
}

export class ProductQuestionAnswerUpdateScript extends BaseScript<
  ProductQuestionAnswerUpdateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(params: ProductQuestionAnswerUpdateParams): Promise<ReviewSectionResult> {
    const input = params.operation.params;
    const current = await this.repository.productQuestionAnswer.findById(input.answerId);
    if (!current || current.answer.questionId !== params.productQuestionId) {
      return sectionErrors([
        {
          message: "Answer not found for this product question",
          code: "NOT_FOUND",
          field: ["answerId"],
        },
      ]);
    }

    const mapped = input.operations.content
      ? mapNestedContentUpdate(
          current.content,
          input.operations.content,
          "QUESTION_ANSWER",
          this.context.hasUser ? this.context.user.id : undefined,
          ["operations", "content"],
        )
      : { patch: {}, errors: [] };
    const propertyPatch: ProductQuestionAnswerPatch = {};
    const properties = input.operations.properties;
    if (properties) {
      if (hasOwn(properties, "isOfficial")) {
        if (properties.isOfficial == null) {
          mapped.errors.push({
            message: "isOfficial cannot be null",
            code: "INVALID_VALUE",
            field: ["operations", "properties", "isOfficial"],
          });
        } else if (properties.isOfficial !== current.answer.isOfficial) {
          propertyPatch.isOfficial = properties.isOfficial;
        }
      }
      if (hasOwn(properties, "isAccepted")) {
        if (properties.isAccepted == null) {
          mapped.errors.push({
            message: "isAccepted cannot be null",
            code: "INVALID_VALUE",
            field: ["operations", "properties", "isAccepted"],
          });
        } else if (properties.isAccepted !== current.answer.isAccepted) {
          propertyPatch.isAccepted = properties.isAccepted;
        }
      }
      if (hasOwn(properties, "sortIndex")) {
        if (properties.sortIndex == null || properties.sortIndex < 0) {
          mapped.errors.push({
            message: "Answer sort index cannot be negative",
            code: "INVALID_SORT_INDEX",
            field: ["operations", "properties", "sortIndex"],
          });
        } else if (properties.sortIndex !== current.answer.sortIndex) {
          propertyPatch.sortIndex = properties.sortIndex;
        }
      }
    }
    if (mapped.errors.length > 0) return sectionErrors(mapped.errors);

    const acquired = await this.repository.content.update(
      input.answerId,

      mapped.patch,
    );
    if (acquired.status === "not_found") {
      return sectionErrors([
        { message: "Answer not found", code: "NOT_FOUND", field: ["answerId"] },
      ]);
    }
    if (mapped.translations) {
      await this.repository.content.replaceTranslations(input.answerId, mapped.translations);
    }
    if (mapped.publications) {
      await this.repository.content.replacePublications(input.answerId, mapped.publications);
    }
    if (Object.keys(propertyPatch).length > 0) {
      await this.repository.productQuestionAnswer.updateProperties(input.answerId, propertyPatch);
    }
    return sectionSuccess(true, input.answerId);
  }

  protected handleError(error: unknown): ReviewSectionResult {
    if (isUniqueViolation(error, "content_item_store_idempotency_unique")) {
      return sectionErrors([
        {
          message: "Content with this idempotency key already exists",
          code: "DUPLICATE_IDEMPOTENCY_KEY",
          field: ["operations", "content", "source", "idempotencyKey"],
        },
      ]);
    }
    if (isUniqueViolation(error, "question_answer_one_accepted_unique")) {
      const result = acceptedAnswerExistsError();
      return sectionErrors(
        result.userErrors.map((userError) => ({
          ...userError,
          field: ["operations", "properties", "isAccepted"],
        })),
      );
    }
    return internalSectionError();
  }
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
