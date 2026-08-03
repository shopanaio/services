import type { ProductQuestionSummary, ProductRatingCriterionSummary } from "../../repositories/models/index.js";
import type { ProductReviewSummaryAggregate } from "../../repositories/summary/SummaryRepository.js";
import { ReviewsType } from "./ReviewsType.js";
import { productReference } from "./references.js";

const breakdown = (row: { rating1Count: number; rating2Count: number; rating3Count: number; rating4Count: number; rating5Count: number }) => ({
  rating1Count: row.rating1Count, rating2Count: row.rating2Count, rating3Count: row.rating3Count,
  rating4Count: row.rating4Count, rating5Count: row.rating5Count,
});
export class ProductReviewSummaryResolver extends ReviewsType<ProductReviewSummaryAggregate | { productId: string }> {
  product() { const props = this.$props; return productReference(isEmptyReviewSummary(props) ? props.productId : props.summary.productId); }
  reviewCount() { const props = this.$props; return isEmptyReviewSummary(props) ? 0 : props.summary.reviewCount; }
  verifiedReviewCount() { const props = this.$props; return isEmptyReviewSummary(props) ? 0 : props.summary.verifiedReviewCount; }
  mediaReviewCount() { const props = this.$props; return isEmptyReviewSummary(props) ? 0 : props.summary.mediaReviewCount; }
  averageRating() { const props = this.$props; return isEmptyReviewSummary(props) ? 0 : props.summary.averageRating; }
  ratingBreakdown() { const props = this.$props; return isEmptyReviewSummary(props) ? breakdown({ rating1Count: 0, rating2Count: 0, rating3Count: 0, rating4Count: 0, rating5Count: 0 }) : breakdown(props.summary); }
  criteria() { const props = this.$props; return isEmptyReviewSummary(props) ? [] : props.criteria.map((row) => new ProductRatingCriterionSummaryResolver(row, this.$ctx)); }
  lastReviewedAt() { const props = this.$props; return isEmptyReviewSummary(props) ? null : props.summary.lastReviewedAt; }
  updatedAt() { const props = this.$props; return isEmptyReviewSummary(props) ? new Date(0).toISOString() : props.summary.updatedAt; }
}
export class ProductRatingCriterionSummaryResolver extends ReviewsType<ProductRatingCriterionSummary> {
  criterion() { return this.resolvers.ratingCriterion(this.$props.criterionId); }
  reviewCount() { return this.$props.reviewCount; }
  averageRating() { return this.$props.averageRating; }
  ratingBreakdown() { return breakdown(this.$props); }
  updatedAt() { return this.$props.updatedAt; }
}
export class ProductQuestionSummaryResolver extends ReviewsType<ProductQuestionSummary | { productId: string }> {
  product() { return productReference(this.$props.productId); }
  questionCount() { const props = this.$props; return isEmptyQuestionSummary(props) ? 0 : props.questionCount; }
  answeredQuestionCount() { const props = this.$props; return isEmptyQuestionSummary(props) ? 0 : props.answeredQuestionCount; }
  unansweredQuestionCount() { const props = this.$props; return isEmptyQuestionSummary(props) ? 0 : props.unansweredQuestionCount; }
  answerCount() { const props = this.$props; return isEmptyQuestionSummary(props) ? 0 : props.answerCount; }
  officialAnswerCount() { const props = this.$props; return isEmptyQuestionSummary(props) ? 0 : props.officialAnswerCount; }
  lastQuestionAt() { const props = this.$props; return isEmptyQuestionSummary(props) ? null : props.lastQuestionAt; }
  lastAnsweredAt() { const props = this.$props; return isEmptyQuestionSummary(props) ? null : props.lastAnsweredAt; }
  updatedAt() { const props = this.$props; return isEmptyQuestionSummary(props) ? new Date(0).toISOString() : props.updatedAt; }
}

function isEmptyReviewSummary(value: ProductReviewSummaryAggregate | { productId: string }): value is { productId: string } {
  return "productId" in value;
}

function isEmptyQuestionSummary(value: ProductQuestionSummary | { productId: string }): value is { productId: string } {
  return !("questionCount" in value);
}
