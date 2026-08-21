import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ReviewReplyPatch } from "../../repositories/review/ReviewReplyRepository.js";
import type { ReviewUpdateOperation } from "../../workflows/dto/index.js";
import { mapNestedContentUpdate } from "./content.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface ReviewReplyUpdateParams {
  reviewId: string;
  operation: Extract<ReviewUpdateOperation, { type: "reviewReplyUpdate" }>;
}

export class ReviewReplyUpdateScript extends BaseScript<
  ReviewReplyUpdateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(params: ReviewReplyUpdateParams): Promise<ReviewSectionResult> {
    const input = params.operation.params;
    const current = await this.repository.reviewReply.findById(input.replyId);
    if (!current || current.reply.reviewId !== params.reviewId) {
      return sectionErrors([
        {
          message: "Reply not found for this review",
          code: "NOT_FOUND",
          field: ["replyId"],
        },
      ]);
    }

    const mapped = input.operations.content
      ? mapNestedContentUpdate(
          current.content,
          input.operations.content,
          "REVIEW_REPLY",
          this.context.hasUser ? this.context.user.id : undefined,
          ["operations", "content"],
        )
      : { patch: {}, errors: [] };
    const propertyPatch: ReviewReplyPatch = {};
    const properties = input.operations.properties;
    if (properties) {
      if (hasOwn(properties, "isOfficial")) {
        if (properties.isOfficial == null) {
          mapped.errors.push({
            message: "isOfficial cannot be null",
            code: "INVALID_VALUE",
            field: ["operations", "properties", "isOfficial"],
          });
        } else if (properties.isOfficial !== current.reply.isOfficial) {
          propertyPatch.isOfficial = properties.isOfficial;
        }
      }
      if (hasOwn(properties, "sortIndex")) {
        if (properties.sortIndex == null || properties.sortIndex < 0) {
          mapped.errors.push({
            message: "Reply sort index cannot be negative",
            code: "INVALID_SORT_INDEX",
            field: ["operations", "properties", "sortIndex"],
          });
        } else if (properties.sortIndex !== current.reply.sortIndex) {
          propertyPatch.sortIndex = properties.sortIndex;
        }
      }
    }
    if (mapped.errors.length > 0) return sectionErrors(mapped.errors);

    const acquired = await this.repository.content.update(
      input.replyId,

      mapped.patch,
    );
    if (acquired.status === "not_found") {
      return sectionErrors([{ message: "Reply not found", code: "NOT_FOUND", field: ["replyId"] }]);
    }
    if (acquired.status === "conflict") {
      return sectionErrors([
        {
          message: "Reply was modified by another user",
          code: "REVISION_CONFLICT",
          field: ["expectedRevision"],
        },
      ]);
    }

    if (mapped.translations) {
      await this.repository.content.replaceTranslations(input.replyId, mapped.translations);
    }
    if (mapped.publications) {
      await this.repository.content.replacePublications(input.replyId, mapped.publications);
    }
    if (Object.keys(propertyPatch).length > 0) {
      await this.repository.reviewReply.updateProperties(input.replyId, propertyPatch);
    }
    return sectionSuccess(true, input.replyId);
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
    return internalSectionError();
  }
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
