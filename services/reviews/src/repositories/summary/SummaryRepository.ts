import { ReadOnly } from "@shopana/shared-kernel";
import { and, asc, eq, inArray } from "drizzle-orm";
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
  async getProductReviewSummaries(
    productIds: readonly string[]
  ): Promise<ProductReviewSummary[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productReviewSummary)
      .where(
        and(
          eq(productReviewSummary.storeId, this.storeId),
          inArray(productReviewSummary.productId, [...new Set(productIds)])
        )
      );
  }

  @ReadOnly()
  async getProductRatingCriterionSummaries(
    productIds: readonly string[]
  ): Promise<ProductRatingCriterionSummary[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productRatingCriterionSummary)
      .where(
        and(
          eq(productRatingCriterionSummary.storeId, this.storeId),
          inArray(
            productRatingCriterionSummary.productId,
            [...new Set(productIds)]
          )
        )
      )
      .orderBy(
        asc(productRatingCriterionSummary.productId),
        asc(productRatingCriterionSummary.criterionId)
      );
  }

  @ReadOnly()
  async getProductQuestionSummaries(
    productIds: readonly string[]
  ): Promise<ProductQuestionSummary[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(productQuestionSummary)
      .where(
        and(
          eq(productQuestionSummary.storeId, this.storeId),
          inArray(productQuestionSummary.productId, [...new Set(productIds)])
        )
      );
  }

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
