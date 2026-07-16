import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { getPgErrorInfo, PG_ERROR_CODES } from "../../kernel/types.js";
import type { ContentItem } from "../../repositories/models/index.js";
import type { OptimisticMutationResult } from "../../repositories/types.js";
import { conflict, internalError, notFound } from "./errors.js";
import type { ReviewDeleteParams, ReviewDeleteResult } from "./types.js";

export class ReviewDeleteScript extends BaseScript<ReviewDeleteParams, ReviewDeleteResult> {
  @Transactional()
  protected async execute(params: ReviewDeleteParams): Promise<ReviewDeleteResult> {
    const aggregate = await this.repository.review.findById(params.id);
    if (!aggregate) return { userErrors: notFound("Review") };
    let result: OptimisticMutationResult<ContentItem>;
    try {
      result = await this.repository.content.delete({
        id: params.id,
        expectedRevision: params.expectedRevision,
        permanent: params.permanent ?? false,
      });
    } catch (error) {
      if (getPgErrorInfo(error)?.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
        return {
          userErrors: [{
            message: "The review is referenced by a review request and cannot be permanently deleted",
            field: ["id"],
            code: "REVIEW_IN_USE",
          }],
        };
      }
      throw error;
    }
    if (result.status === "not_found") return { userErrors: notFound("Review") };
    if (result.status === "conflict") return { userErrors: conflict("expectedRevision") };
    this.logger.info({ reviewId: params.id, permanent: params.permanent ?? false }, "Review deleted");
    return {
      deletedReviewId: params.id,
      productId: aggregate.review.productId,
      permanent: params.permanent ?? false,
      userErrors: [],
    };
  }

  protected handleError(): ReviewDeleteResult {
    return { userErrors: internalError() };
  }
}
