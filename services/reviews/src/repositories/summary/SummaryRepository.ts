import { ReadOnly } from "@shopana/shared-kernel";
import { and, asc, eq } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productQuestionSummary,
  productRatingCriterionSummary,
  productReviewSummary,
  type ProductQuestionSummary,
  type ProductRatingCriterionSummary,
  type ProductReviewSummary,
} from "../models/index.js";

export interface ProductReviewSummaryAggregate {
  summary: ProductReviewSummary;
  criteria: ProductRatingCriterionSummary[];
}

export class SummaryRepository extends BaseRepository {
  @ReadOnly()
  async findProductReviewSummary(
    productId: string
  ): Promise<ProductReviewSummaryAggregate | null> {
    const rows = await this.connection
      .select()
      .from(productReviewSummary)
      .where(
        and(
          eq(productReviewSummary.storeId, this.storeId),
          eq(productReviewSummary.productId, productId)
        )
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
          eq(productRatingCriterionSummary.productId, productId)
        )
      )
      .orderBy(asc(productRatingCriterionSummary.criterionId));
    return { summary, criteria };
  }

  @ReadOnly()
  async findProductQuestionSummary(
    productId: string
  ): Promise<ProductQuestionSummary | null> {
    const rows = await this.connection
      .select()
      .from(productQuestionSummary)
      .where(
        and(
          eq(productQuestionSummary.storeId, this.storeId),
          eq(productQuestionSummary.productId, productId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
