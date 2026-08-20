import DataLoader from "dataloader";
import type { ProductQuestionSummary } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import type { ProductReviewSummaryAggregate } from "../repositories/summary/SummaryRepository.js";

export class SummaryLoader {
  public readonly productReviewSummary: DataLoader<string, ProductReviewSummaryAggregate | null>;
  public readonly productQuestionSummary: DataLoader<string, ProductQuestionSummary | null>;

  constructor(repository: Repository) {
    this.productReviewSummary = new DataLoader(async (productIds) => {
      const [summaries, criteria] = await Promise.all([
        repository.summary.getProductReviewSummaries(productIds),
        repository.summary.getProductRatingCriterionSummaries(productIds),
      ]);
      return productIds.map((productId) => {
        const summary = summaries.find((row) => row.productId === productId);
        return summary
          ? {
              summary,
              criteria: criteria.filter((row) => row.productId === productId),
            }
          : null;
      });
    });

    this.productQuestionSummary = new DataLoader(async (productIds) => {
      const rows = await repository.summary.getProductQuestionSummaries(productIds);
      return productIds.map((productId) => rows.find((row) => row.productId === productId) ?? null);
    });
  }
}
