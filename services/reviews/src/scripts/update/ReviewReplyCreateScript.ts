import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ReviewUpdateOperation } from "../../workflows/dto/index.js";
import { mapContentCreate } from "../create/content.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface ReviewReplyCreateParams {
  reviewId: string;
  operation: Extract<ReviewUpdateOperation, { type: "reviewReplyCreate" }>;
}

export class ReviewReplyCreateScript extends BaseScript<
  ReviewReplyCreateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(
    params: ReviewReplyCreateParams
  ): Promise<ReviewSectionResult> {
    const review = await this.repository.review.findById(params.reviewId);
    if (!review) {
      return sectionErrors([
        { message: "Review not found", code: "NOT_FOUND" },
      ]);
    }

    const input = params.operation.params;
    const mapped = mapContentCreate(
      input.content,
      "REVIEW_REPLY",
      this.context.hasUser ? this.context.user.id : undefined
    );
    const errors = [...mapped.errors];
    if (input.sortIndex != null && input.sortIndex < 0) {
      errors.push({
        message: "Reply sort index cannot be negative",
        code: "INVALID_SORT_INDEX",
        field: ["sortIndex"],
      });
    }
    if (errors.length > 0 || !mapped.values) return sectionErrors(errors);

    const created = await this.repository.reviewReply.create({
      content: mapped.values,
      reply: {
        reviewId: params.reviewId,
        isOfficial: input.isOfficial ?? true,
        sortIndex: input.sortIndex ?? 0,
      },
    });
    return sectionSuccess(true, created.reply.id);
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
    return internalSectionError();
  }
}
