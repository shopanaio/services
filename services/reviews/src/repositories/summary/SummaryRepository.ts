import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  contentItem,
  productQuestion,
  productQuestionSummary,
  productRatingCriterionSummary,
  productReviewSummary,
  review,
  reviewMedia,
  reviewRating,
  questionAnswer,
  type ProductQuestionSummary,
  type ProductRatingCriterionSummary,
  type ProductReviewSummary,
} from "../models/index.js";

export interface ProductReviewSummaryAggregate {
  summary: ProductReviewSummary;
  criteria: ProductRatingCriterionSummary[];
}

export class SummaryRepository extends BaseRepository {
  @Transactional()
  async refreshProductReviewSummary(productId: string): Promise<void> {
    const lockKey = `reviews:product-review-summary:${this.storeId}:${productId}`;

    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    `);

    await this.connection
      .delete(productRatingCriterionSummary)
      .where(
        and(
          eq(productRatingCriterionSummary.storeId, this.storeId),
          eq(productRatingCriterionSummary.productId, productId),
        ),
      );

    await this.connection
      .delete(productReviewSummary)
      .where(
        and(
          eq(productReviewSummary.storeId, this.storeId),
          eq(productReviewSummary.productId, productId),
        ),
      );

    await this.connection.execute(sql`
      WITH eligible_reviews AS (
        SELECT
          ${review.id} AS review_id,
          ${review.storeId} AS store_id,
          ${review.productId} AS product_id,
          ${review.rating} AS rating,
          ${review.verificationStatus} AS verification_status,
          ${contentItem.createdAt} AS reviewed_at,
          EXISTS (
            SELECT 1
            FROM ${reviewMedia}
            WHERE ${reviewMedia.storeId} = ${review.storeId}
              AND ${reviewMedia.reviewId} = ${review.id}
              AND ${reviewMedia.status} = 'PUBLISHED'
          ) AS has_media
        FROM ${review}
        INNER JOIN ${contentItem} ON ${contentItem.id} = ${review.id}
        WHERE ${review.storeId} = ${this.storeId}
          AND ${review.productId} = ${productId}
          AND ${contentItem.storeId} = ${this.storeId}
          AND ${contentItem.status} = 'PUBLISHED'
          AND ${contentItem.deletedAt} IS NULL
      )
      INSERT INTO ${productReviewSummary} (
        product_id,
        store_id,
        review_count,
        verified_review_count,
        media_review_count,
        rating_sum,
        rating_1_count,
        rating_2_count,
        rating_3_count,
        rating_4_count,
        rating_5_count,
        last_reviewed_at,
        updated_at
      )
      SELECT
        product_id,
        store_id,
        count(*)::integer,
        count(*) FILTER (WHERE verification_status = 'VERIFIED')::integer,
        count(*) FILTER (WHERE has_media)::integer,
        sum(rating)::bigint,
        count(*) FILTER (WHERE rating = 1)::integer,
        count(*) FILTER (WHERE rating = 2)::integer,
        count(*) FILTER (WHERE rating = 3)::integer,
        count(*) FILTER (WHERE rating = 4)::integer,
        count(*) FILTER (WHERE rating = 5)::integer,
        max(reviewed_at),
        now()
      FROM eligible_reviews
      GROUP BY product_id, store_id
    `);

    await this.connection.execute(sql`
      WITH eligible_ratings AS (
        SELECT
          ${review.storeId} AS store_id,
          ${review.productId} AS product_id,
          ${reviewRating.criterionId} AS criterion_id,
          ${reviewRating.value} AS rating
        FROM ${reviewRating}
        INNER JOIN ${review} ON ${review.id} = ${reviewRating.reviewId}
        INNER JOIN ${contentItem} ON ${contentItem.id} = ${review.id}
        WHERE ${review.storeId} = ${this.storeId}
          AND ${review.productId} = ${productId}
          AND ${reviewRating.storeId} = ${this.storeId}
          AND ${contentItem.storeId} = ${this.storeId}
          AND ${contentItem.status} = 'PUBLISHED'
          AND ${contentItem.deletedAt} IS NULL
      )
      INSERT INTO ${productRatingCriterionSummary} (
        store_id,
        product_id,
        criterion_id,
        review_count,
        rating_sum,
        rating_1_count,
        rating_2_count,
        rating_3_count,
        rating_4_count,
        rating_5_count,
        updated_at
      )
      SELECT
        store_id,
        product_id,
        criterion_id,
        count(*)::integer,
        sum(rating)::bigint,
        count(*) FILTER (WHERE rating = 1)::integer,
        count(*) FILTER (WHERE rating = 2)::integer,
        count(*) FILTER (WHERE rating = 3)::integer,
        count(*) FILTER (WHERE rating = 4)::integer,
        count(*) FILTER (WHERE rating = 5)::integer,
        now()
      FROM eligible_ratings
      GROUP BY store_id, product_id, criterion_id
    `);
  }

  @Transactional()
  async refreshProductQuestionSummary(productId: string): Promise<void> {
    const lockKey = `reviews:product-question-summary:${this.storeId}:${productId}`;

    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    `);

    await this.connection
      .delete(productQuestionSummary)
      .where(
        and(
          eq(productQuestionSummary.storeId, this.storeId),
          eq(productQuestionSummary.productId, productId),
        ),
      );

    await this.connection.execute(sql`
      WITH eligible_questions AS (
        SELECT
          ${productQuestion.id} AS question_id,
          ${productQuestion.storeId} AS store_id,
          ${productQuestion.productId} AS product_id,
          ${contentItem.createdAt} AS questioned_at
        FROM ${productQuestion}
        INNER JOIN ${contentItem} ON ${contentItem.id} = ${productQuestion.id}
        WHERE ${productQuestion.storeId} = ${this.storeId}
          AND ${productQuestion.productId} = ${productId}
          AND ${contentItem.storeId} = ${this.storeId}
          AND ${contentItem.status} = 'PUBLISHED'
          AND ${contentItem.deletedAt} IS NULL
      ),
      eligible_answers AS (
        SELECT
          eligible_questions.question_id,
          eligible_questions.store_id,
          eligible_questions.product_id,
          ${questionAnswer.isOfficial} AS is_official,
          ${contentItem.createdAt} AS answered_at
        FROM ${questionAnswer}
        INNER JOIN ${contentItem} ON ${contentItem.id} = ${questionAnswer.id}
        INNER JOIN eligible_questions
          ON eligible_questions.question_id = ${questionAnswer.questionId}
        WHERE ${questionAnswer.storeId} = ${this.storeId}
          AND ${contentItem.storeId} = ${this.storeId}
          AND ${contentItem.status} = 'PUBLISHED'
          AND ${contentItem.deletedAt} IS NULL
      ),
      question_stats AS (
        SELECT
          store_id,
          product_id,
          count(*)::integer AS question_count,
          max(questioned_at) AS last_question_at
        FROM eligible_questions
        GROUP BY store_id, product_id
      ),
      answer_stats AS (
        SELECT
          store_id,
          product_id,
          count(DISTINCT question_id)::integer AS answered_question_count,
          count(*)::integer AS answer_count,
          count(*) FILTER (WHERE is_official)::integer AS official_answer_count,
          max(answered_at) AS last_answered_at
        FROM eligible_answers
        GROUP BY store_id, product_id
      )
      INSERT INTO ${productQuestionSummary} (
        product_id,
        store_id,
        question_count,
        answered_question_count,
        answer_count,
        official_answer_count,
        last_question_at,
        last_answered_at,
        updated_at
      )
      SELECT
        question_stats.product_id,
        question_stats.store_id,
        question_stats.question_count,
        coalesce(answer_stats.answered_question_count, 0),
        coalesce(answer_stats.answer_count, 0),
        coalesce(answer_stats.official_answer_count, 0),
        question_stats.last_question_at,
        answer_stats.last_answered_at,
        now()
      FROM question_stats
      LEFT JOIN answer_stats
        ON answer_stats.store_id = question_stats.store_id
        AND answer_stats.product_id = question_stats.product_id
    `);
  }

  @ReadOnly()
  async getProductReviewSummaries(productIds: readonly string[]): Promise<ProductReviewSummary[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productReviewSummary)
      .where(
        and(
          eq(productReviewSummary.storeId, this.storeId),
          inArray(productReviewSummary.productId, [...new Set(productIds)]),
        ),
      );
  }

  @ReadOnly()
  async getProductRatingCriterionSummaries(
    productIds: readonly string[],
  ): Promise<ProductRatingCriterionSummary[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productRatingCriterionSummary)
      .where(
        and(
          eq(productRatingCriterionSummary.storeId, this.storeId),
          inArray(productRatingCriterionSummary.productId, [...new Set(productIds)]),
        ),
      )
      .orderBy(
        asc(productRatingCriterionSummary.productId),
        asc(productRatingCriterionSummary.criterionId),
      );
  }

  @ReadOnly()
  async getProductQuestionSummaries(
    productIds: readonly string[],
  ): Promise<ProductQuestionSummary[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productQuestionSummary)
      .where(
        and(
          eq(productQuestionSummary.storeId, this.storeId),
          inArray(productQuestionSummary.productId, [...new Set(productIds)]),
        ),
      );
  }

  @ReadOnly()
  async findProductReviewSummary(productId: string): Promise<ProductReviewSummaryAggregate | null> {
    const rows = await this.connection
      .select()
      .from(productReviewSummary)
      .where(
        and(
          eq(productReviewSummary.storeId, this.storeId),
          eq(productReviewSummary.productId, productId),
        ),
      )
      .limit(1);
    const summary = rows[0];
    if (!summary) return null;

    const criteria = await this.connection
      .select()
      .from(productRatingCriterionSummary)
      .where(
        and(
          eq(productRatingCriterionSummary.storeId, this.storeId),
          eq(productRatingCriterionSummary.productId, productId),
        ),
      )
      .orderBy(asc(productRatingCriterionSummary.criterionId));
    return { summary, criteria };
  }

  @ReadOnly()
  async findProductQuestionSummary(productId: string): Promise<ProductQuestionSummary | null> {
    const rows = await this.connection
      .select()
      .from(productQuestionSummary)
      .where(
        and(
          eq(productQuestionSummary.storeId, this.storeId),
          eq(productQuestionSummary.productId, productId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
