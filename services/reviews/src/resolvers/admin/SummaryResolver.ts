import type {
  ProductQuestionSummary,
  ProductRatingCriterionSummary,
} from "../../repositories/models/index.js";
import type { ProductReviewSummaryAggregate } from "../../repositories/summary/SummaryRepository.js";
import { ReviewsType } from "./ReviewsType.js";
import { productReference } from "./references.js";

function ratingBreakdown(row: {
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
}) {
  return {
    rating1Count: row.rating1Count,
    rating2Count: row.rating2Count,
    rating3Count: row.rating3Count,
    rating4Count: row.rating4Count,
    rating5Count: row.rating5Count,
  };
}

export class ProductReviewSummaryResolver extends ReviewsType<ProductReviewSummaryAggregate> {
  product() { return productReference(this.$props.summary.productId); }
  reviewCount() { return this.$props.summary.reviewCount; }
  verifiedReviewCount() { return this.$props.summary.verifiedReviewCount; }
  mediaReviewCount() { return this.$props.summary.mediaReviewCount; }
  ratingSum() { return this.$props.summary.ratingSum.toString(); }
  averageRating() { return this.$props.summary.averageRating; }
  ratingBreakdown() { return ratingBreakdown(this.$props.summary); }
  criteria() {
    return this.$props.criteria.map(
      (row) => new ProductRatingCriterionSummaryResolver(row, this.$ctx)
    );
  }
  lastReviewedAt() { return this.$props.summary.lastReviewedAt; }
  updatedAt() { return this.$props.summary.updatedAt; }
}

export class ProductRatingCriterionSummaryResolver extends ReviewsType<ProductRatingCriterionSummary> {
  criterion() { return this.resolvers.ratingCriterion(this.$props.criterionId); }
  reviewCount() { return this.$props.reviewCount; }
  ratingSum() { return this.$props.ratingSum.toString(); }
  averageRating() { return this.$props.averageRating; }
  ratingBreakdown() { return ratingBreakdown(this.$props); }
  updatedAt() { return this.$props.updatedAt; }
}

export class ProductQuestionSummaryResolver extends ReviewsType<ProductQuestionSummary> {
  product() { return productReference(this.$props.productId); }
  questionCount() { return this.$props.questionCount; }
  answeredQuestionCount() { return this.$props.answeredQuestionCount; }
  unansweredQuestionCount() { return this.$props.unansweredQuestionCount; }
  answerCount() { return this.$props.answerCount; }
  officialAnswerCount() { return this.$props.officialAnswerCount; }
  lastQuestionAt() { return this.$props.lastQuestionAt; }
  lastAnsweredAt() { return this.$props.lastAnsweredAt; }
  updatedAt() { return this.$props.updatedAt; }
}
