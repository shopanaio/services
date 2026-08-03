import type { ReviewReplyConnectionInput, ReviewReplyRelayInput } from "../../repositories/review/ReviewReplyRepository.js";
import type { ReviewConnectionInput, ReviewRelayInput } from "../../repositories/review/ReviewRepository.js";
import { BaseConnectionResolver, type ConnectionData } from "./connection/BaseConnectionResolver.js";

export type StorefrontReviewConnectionInput = {
  first?: number | null; after?: string | null; last?: number | null; before?: string | null;
  productId?: string; variantId?: string; customerId?: string;
  rating?: number | null; verifiedOnly?: boolean | null; withMediaOnly?: boolean | null;
  sort?: "NEWEST" | "OLDEST" | "HIGHEST_RATING" | "LOWEST_RATING" | "MOST_HELPFUL" | null;
  includeOwnedUnpublished?: boolean;
};

export class ReviewConnectionResolver extends BaseConnectionResolver<StorefrontReviewConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { productId, variantId, customerId, rating, verifiedOnly, withMediaOnly, sort, includeOwnedUnpublished, ...pagination } = this.$props;
    const where: ReviewRelayInput["where"] = { _and: [
      ...(includeOwnedUnpublished && customerId
        ? [{ authorCustomerId: { _eq: customerId } }]
        : [{ status: { _eq: "PUBLISHED" } }]),
      { redactedAt: { _is: null } },
      ...(productId ? [{ productId: { _eq: productId } }] : []),
      ...(variantId ? [{ variantId: { _eq: variantId } }] : []),
      ...(customerId ? [{ authorCustomerId: { _eq: customerId } }] : []),
      ...(rating ? [{ rating: { _eq: rating } }] : []),
      ...(verifiedOnly ? [{ verificationStatus: { _eq: "VERIFIED" } }] : []),
      ...(withMediaOnly ? [{ mediaCount: { _gt: 0 } }] : []),
    ] };
    const orderBy = reviewOrder(sort);
    return this.$ctx.kernel.repository.review.getConnection({ ...pagination, where, orderBy } as ReviewConnectionInput);
  }
  protected createNodeResolver(id: string) { return this.resolvers.review(id); }
}

export type StorefrontReviewReplyConnectionInput = Pick<StorefrontReviewConnectionInput, "first" | "after" | "last" | "before"> & { reviewId: string };
export class ReviewReplyConnectionResolver extends BaseConnectionResolver<StorefrontReviewReplyConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { reviewId, ...pagination } = this.$props;
    const where: ReviewReplyRelayInput["where"] = { _and: [
      { reviewId: { _eq: reviewId } },
      { status: { _eq: "PUBLISHED" } },
      { redactedAt: { _is: null } },
    ] };
    return this.$ctx.kernel.repository.reviewReply.getConnection({ ...pagination, where, orderBy: [
      { field: "sortIndex", direction: "asc" }, { field: "id", direction: "asc" },
    ] } as ReviewReplyConnectionInput);
  }
  protected createNodeResolver(id: string) { return this.resolvers.reviewReply(id); }
}

function reviewOrder(sort: StorefrontReviewConnectionInput["sort"]): ReviewConnectionInput["orderBy"] {
  const direction = sort === "OLDEST" ? "asc" : "desc";
  const field = sort === "HIGHEST_RATING" || sort === "LOWEST_RATING" ? "rating"
    : sort === "MOST_HELPFUL" ? "likeCount" : "createdAt";
  const fieldDirection = sort === "LOWEST_RATING" ? "asc" : direction;
  return [{ field, direction: fieldDirection }, { field: "id", direction: fieldDirection }];
}
