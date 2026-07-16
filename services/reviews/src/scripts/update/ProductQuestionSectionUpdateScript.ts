import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ContentPatch } from "../../repositories/content/ContentRepository.js";
import type { ProductQuestionPatch } from "../../repositories/question/ProductQuestionRepository.js";
import type { ProductQuestionUpdateOperation } from "../../workflows/dto/index.js";
import {
  mapContentAuthorUpdate,
  mapContentModerationUpdate,
  mapContentPublications,
  mapContentSourceUpdate,
  mapContentTextUpdate,
  mapContentTranslations,
} from "./content.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

type ProductQuestionAggregateSectionOperation = Exclude<
  ProductQuestionUpdateOperation,
  | { type: "productQuestionAnswerCreate" }
  | { type: "productQuestionAnswerUpdate" }
  | { type: "productQuestionAnswerDelete" }
>;

export interface ProductQuestionSectionUpdateParams {
  productQuestionId: string;
  operation: ProductQuestionAggregateSectionOperation;
}

export class ProductQuestionSectionUpdateScript extends BaseScript<
  ProductQuestionSectionUpdateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(
    params: ProductQuestionSectionUpdateParams
  ): Promise<ReviewSectionResult> {
    const aggregate = await this.repository.productQuestion.findById(
      params.productQuestionId
    );
    if (!aggregate) {
      return sectionErrors([
        { message: "Product question not found", code: "NOT_FOUND" },
      ]);
    }

    const { operation } = params;
    switch (operation.type) {
      case "contentUpdate":
        return this.updateContentPatch(
          params.productQuestionId,
          mapContentTextUpdate(
            aggregate.content,
            operation.params,
            "PRODUCT_QUESTION"
          )
        );
      case "contentAuthorUpdate":
        return this.updateContentPatch(
          params.productQuestionId,
          mapContentAuthorUpdate(aggregate.content, operation.params)
        );
      case "contentSourceUpdate":
        return this.updateContentPatch(
          params.productQuestionId,
          mapContentSourceUpdate(aggregate.content, operation.params)
        );
      case "contentModerationUpdate":
        return this.updateContentPatch(
          params.productQuestionId,
          mapContentModerationUpdate(
            aggregate.content,
            operation.params,
            this.context.hasUser ? this.context.user.id : undefined
          )
        );
      case "contentTranslationsSync": {
        const mapped = mapContentTranslations(
          operation.params.items,
          "PRODUCT_QUESTION",
          this.context.hasUser ? this.context.user.id : undefined
        );
        if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
        await this.repository.content.replaceTranslations(
          params.productQuestionId,
          mapped.items
        );
        return sectionSuccess();
      }
      case "contentPublicationsSync": {
        const mapped = mapContentPublications(operation.params.items);
        if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
        await this.repository.content.replacePublications(
          params.productQuestionId,
          mapped.items
        );
        return sectionSuccess();
      }
      case "productQuestionUpdate":
        return this.updateSubject(
          params.productQuestionId,
          aggregate.question,
          operation.params
        );
    }
  }

  protected handleError(error: unknown): ReviewSectionResult {
    if (isUniqueViolation(error, "content_item_store_idempotency_unique")) {
      return sectionErrors([
        {
          message: "Content with this idempotency key already exists",
          code: "DUPLICATE_IDEMPOTENCY_KEY",
          field: ["idempotencyKey"],
        },
      ]);
    }
    return internalSectionError();
  }

  private async updateContentPatch(
    productQuestionId: string,
    mapped: {
      patch: ContentPatch;
      errors: ReviewSectionResult["userErrors"];
    }
  ): Promise<ReviewSectionResult> {
    if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
    if (Object.keys(mapped.patch).length === 0) return sectionSuccess(false);
    const updated = await this.repository.content.updateWithinRevision(
      productQuestionId,
      mapped.patch
    );
    return updated
      ? sectionSuccess()
      : sectionErrors([
          { message: "Product question not found", code: "NOT_FOUND" },
        ]);
  }

  private async updateSubject(
    productQuestionId: string,
    current: { productId: string; variantId: string | null },
    input: Extract<
      ProductQuestionAggregateSectionOperation,
      { type: "productQuestionUpdate" }
    >["params"]
  ): Promise<ReviewSectionResult> {
    const patch: ProductQuestionPatch = {};
    if (hasOwn(input, "productId")) {
      if (!input.productId) {
        return sectionErrors([
          {
            message: "Product cannot be cleared",
            code: "INVALID_PRODUCT",
            field: ["productId"],
          },
        ]);
      }
      patch.productId = input.productId;
    }
    if (hasOwn(input, "variantId")) patch.variantId = input.variantId ?? null;

    const changed = changedQuestionPatch(current, patch);
    if (Object.keys(changed).length === 0) return sectionSuccess(false);
    const updated = await this.repository.productQuestion.updateSubject(
      productQuestionId,
      changed
    );
    return updated
      ? sectionSuccess()
      : sectionErrors([
          { message: "Product question not found", code: "NOT_FOUND" },
        ]);
  }
}

function changedQuestionPatch(
  current: { productId: string; variantId: string | null },
  patch: ProductQuestionPatch
): ProductQuestionPatch {
  const changed: ProductQuestionPatch = {};
  if (patch.productId !== undefined && patch.productId !== current.productId) {
    changed.productId = patch.productId;
  }
  if (patch.variantId !== undefined && patch.variantId !== current.variantId) {
    changed.variantId = patch.variantId;
  }
  return changed;
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
