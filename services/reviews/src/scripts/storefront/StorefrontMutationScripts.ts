import { Transactional } from "@shopana/shared-kernel";
import type { ContentPatch } from "../../repositories/content/ContentRepository.js";
import type { ProductQuestionAnswerRepository } from "../../repositories/question/ProductQuestionAnswerRepository.js";
import type { ReviewRepository } from "../../repositories/review/ReviewRepository.js";
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import { internalError } from "../create/content.js";

type ReviewRatings = Parameters<ReviewRepository["replaceRatings"]>[1];
type ReviewMedia = Parameters<ReviewRepository["replaceMedia"]>[1];
type AnswerCreate = Parameters<ProductQuestionAnswerRepository["create"]>[0];

export interface StorefrontReviewUpdateParams {
  id: string;
  expectedRevision: number;
  contentPatch: ContentPatch;
  rating?: number;
  ratings?: ReviewRatings;
  media?: ReviewMedia;
}

export type StorefrontReviewUpdateResult =
  | { status: "applied"; productId: string; userErrors: UserError[] }
  | { status: "conflict" | "not_found"; userErrors: UserError[] }
  | { status: "error"; userErrors: UserError[] };

export class StorefrontReviewUpdateScript extends BaseScript<
  StorefrontReviewUpdateParams,
  StorefrontReviewUpdateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontReviewUpdateParams,
  ): Promise<StorefrontReviewUpdateResult> {
    const updated = await this.repository.content.update(
      params.id,
      params.expectedRevision,
      params.contentPatch,
    );
    if (updated.status !== "applied") {
      return { status: updated.status, userErrors: [] };
    }
    if (params.rating !== undefined) {
      const row = await this.repository.review.updateDetails(params.id, { rating: params.rating });
      if (!row) throw new Error("Review disappeared during storefront update");
    }
    if (params.ratings !== undefined) {
      await this.repository.review.replaceRatings(params.id, params.ratings);
    }
    if (params.media !== undefined) {
      await this.repository.review.replaceMedia(params.id, params.media);
    }
    await this.repository.engagement.refreshContentMetrics(params.id);
    const review = await this.repository.review.findById(params.id);
    if (!review) throw new Error("Review disappeared during storefront update");
    await this.repository.summary.refreshProductReviewSummary(review.review.productId);
    return { status: "applied", productId: review.review.productId, userErrors: [] };
  }

  protected handleError(): StorefrontReviewUpdateResult {
    return { status: "error", userErrors: internalError() };
  }
}

export interface StorefrontQuestionAnswerCreateParams {
  questionId: string;
  expectedRevision: number;
  maxAnswers: number;
  input: AnswerCreate;
}

export type StorefrontQuestionAnswerCreateResult =
  | { status: "applied"; answerId: string; productId: string; userErrors: UserError[] }
  | { status: "conflict" | "not_found" | "limit_exceeded"; userErrors: UserError[] }
  | { status: "error"; userErrors: UserError[] };

export class StorefrontQuestionAnswerCreateScript extends BaseScript<
  StorefrontQuestionAnswerCreateParams,
  StorefrontQuestionAnswerCreateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontQuestionAnswerCreateParams,
  ): Promise<StorefrontQuestionAnswerCreateResult> {
    const question = await this.repository.productQuestion.findById(params.questionId);
    if (!question || question.content.status !== "PUBLISHED" || question.content.redactedAt) {
      return { status: "not_found", userErrors: [] };
    }
    const count = await this.repository.productQuestionAnswer.getConnection({
      first: 1,
      where: { questionId: { _eq: params.questionId } },
    });
    if (count.totalCount >= params.maxAnswers) {
      return { status: "limit_exceeded", userErrors: [] };
    }
    const acquired = await this.repository.content.update(
      params.questionId,
      params.expectedRevision,
      {},
    );
    if (acquired.status !== "applied") {
      return { status: acquired.status, userErrors: [] };
    }
    const created = await this.repository.productQuestionAnswer.create(params.input);
    await this.repository.engagement.refreshContentMetrics(params.questionId);
    await this.repository.summary.refreshProductQuestionSummary(question.question.productId);
    return {
      status: "applied",
      answerId: created.answer.id,
      productId: question.question.productId,
      userErrors: [],
    };
  }

  protected handleError(): StorefrontQuestionAnswerCreateResult {
    return { status: "error", userErrors: internalError() };
  }
}
