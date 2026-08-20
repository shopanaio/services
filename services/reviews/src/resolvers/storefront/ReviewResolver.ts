import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  Review,
  ReviewMedia,
  ReviewRating,
  ReviewReply,
} from "../../repositories/models/index.js";
import type { ReviewReplyConnectionInput } from "../../repositories/review/ReviewReplyRepository.js";
import { ContentResolver } from "./ContentResolver.js";
import { ReviewReplyConnectionResolver } from "./ReviewConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import { mediaReference, productReference, variantReference } from "./references.js";

@SubgraphReference()
export class ReviewResolver extends ContentResolver<Review> {
  async $preload() {
    const row = await this.$ctx.loaders.review.load(this.$props);
    if (!row) throw new PreloadNotFoundError("Review not found");
    await this.loadContent();
    return row;
  }
  async product() {
    return productReference(await this.$get("productId"));
  }
  async variant() {
    return variantReference(await this.$get("variantId"));
  }
  rating() {
    return this.$get("rating");
  }
  verificationStatus() {
    return this.$get("verificationStatus");
  }
  async isVerifiedPurchase() {
    return (await this.$get("verificationStatus")) === "VERIFIED";
  }
  isIncentivized() {
    return this.$get("isIncentivized");
  }
  incentiveDisclosure() {
    return this.$get("incentiveDisclosure");
  }
  async ratings() {
    return (await this.$ctx.loaders.reviewRatings.load(this.$props)).map(
      (row) => new ReviewRatingResolver(row, this.$ctx),
    );
  }
  async media() {
    const rows = (await this.$ctx.loaders.reviewMedia.load(this.$props)).filter(
      (row) => row.status === "PUBLISHED",
    );
    rows.forEach((row) => this.$ctx.loaders.reviewMediaItem.prime(row.id, row));
    return rows.map((row) => new ReviewMediaResolver(row.id, this.$ctx));
  }
  replies(args: ReviewReplyConnectionInput) {
    return new ReviewReplyConnectionResolver({ ...args, reviewId: this.$props }, this.$ctx);
  }
}
export class ReviewRatingResolver extends ReviewsType<ReviewRating> {
  criterion() {
    return this.resolvers.ratingCriterion(this.$props.criterionId);
  }
  value() {
    return this.$props.value;
  }
  createdAt() {
    return this.$props.createdAt;
  }
  updatedAt() {
    return this.$props.updatedAt;
  }
}
@SubgraphReference()
export class ReviewMediaResolver extends ReviewsType<string, ReviewMedia> {
  async $preload() {
    const row = await this.$ctx.loaders.reviewMediaItem.load(this.$props);
    if (!row || row.status !== "PUBLISHED")
      throw new PreloadNotFoundError("Published review media not found");
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewMedia);
  }
  async review() {
    return this.resolvers.review(await this.$get("reviewId"));
  }
  async media() {
    return mediaReference(await this.$get("fileId"));
  }
  sortIndex() {
    return this.$get("sortIndex");
  }
  caption() {
    return this.$get("caption");
  }
  status() {
    return this.$get("status");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}
@SubgraphReference()
export class ReviewReplyResolver extends ContentResolver<ReviewReply> {
  async $preload() {
    const row = await this.$ctx.loaders.reviewReply.load(this.$props);
    if (!row) throw new PreloadNotFoundError("Review reply not found");
    await this.loadContent();
    return row;
  }
  async review() {
    return this.resolvers.review(await this.$get("reviewId"));
  }
  isOfficial() {
    return this.$get("isOfficial");
  }
  sortIndex() {
    return this.$get("sortIndex");
  }
}
