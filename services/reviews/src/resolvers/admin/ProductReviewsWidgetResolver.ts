import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ProductQuestionSummary } from "../../repositories/models/index.js";
import type { ProductReviewSummaryAggregate } from "../../repositories/summary/SummaryRepository.js";
import { ReviewsType } from "./ReviewsType.js";
import { ProductQuestionSummaryResolver, ProductReviewSummaryResolver } from "./SummaryResolver.js";

interface ProductReviewsWidgetData {
  reviewSummary: ProductReviewSummaryAggregate | null;
  questionSummary: ProductQuestionSummary | null;
}

export class WidgetQueryResolver extends ReviewsType<Record<string, never>> {
  reviews(args: { productId: string }) {
    const productId = this.decodeId(args.productId, GlobalIdEntity.Product);
    return new ProductReviewsWidgetResolver(productId, this.$ctx);
  }
}

export class ProductReviewsWidgetResolver extends ReviewsType<string, ProductReviewsWidgetData> {
  async $preload(): Promise<ProductReviewsWidgetData> {
    const [reviewSummary, questionSummary] = await Promise.all([
      this.$ctx.loaders.productReviewSummary.load(this.$props),
      this.$ctx.loaders.productQuestionSummary.load(this.$props),
    ]);

    return { reviewSummary, questionSummary };
  }

  async reviewSummary() {
    const summary = await this.$get("reviewSummary");
    return summary ? new ProductReviewSummaryResolver(summary, this.$ctx) : null;
  }

  async questionSummary() {
    const summary = await this.$get("questionSummary");
    return summary ? new ProductQuestionSummaryResolver(summary, this.$ctx) : null;
  }
}
