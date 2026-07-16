import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { ReviewUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface ReviewReplyDeleteParams {
  reviewId: string;
  operation: Extract<ReviewUpdateOperation, { type: "reviewReplyDelete" }>;
}

export class ReviewReplyDeleteScript extends BaseScript<
  ReviewReplyDeleteParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(
    params: ReviewReplyDeleteParams
  ): Promise<ReviewSectionResult> {
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

    const result = await this.repository.content.delete({
      id: input.replyId,
      expectedRevision: input.expectedRevision,
      permanent: input.permanent ?? false,
    });
    if (result.status === "not_found") {
      return sectionErrors([
        { message: "Reply not found", code: "NOT_FOUND", field: ["replyId"] },
      ]);
    }
    if (result.status === "conflict") {
      return sectionErrors([
        {
          message: "Reply was modified by another user",
          code: "REVISION_CONFLICT",
          field: ["expectedRevision"],
        },
      ]);
    }
    return sectionSuccess(true, input.replyId);
  }

  protected handleError(_error: unknown): ReviewSectionResult {
    return internalSectionError();
  }
}
