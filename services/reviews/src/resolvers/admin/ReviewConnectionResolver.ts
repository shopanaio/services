import type { ReviewReplyConnectionInput } from "../../repositories/review/ReviewReplyRepository.js";
import type { ReviewConnectionInput } from "../../repositories/review/ReviewRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class ReviewConnectionResolver extends BaseConnectionResolver<ReviewConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.review.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.review(nodeId);
  }
}

export type ScopedReviewReplyConnectionInput = ReviewReplyConnectionInput & {
  reviewId?: string;
};

export class ReviewReplyConnectionResolver extends BaseConnectionResolver<ScopedReviewReplyConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { reviewId, where, ...args } = this.$props;
    return this.$ctx.kernel.repository.reviewReply.getConnection({
      ...args,
      where: reviewId
        ? { _and: [{ reviewId: { _eq: reviewId } }, ...(where ? [where] : [])] }
        : where,
    });
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.reviewReply(nodeId);
  }
}
