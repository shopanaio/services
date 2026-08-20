import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type { ApiReviewOrderByInput, ApiReviewWhereInput } from "@/graphql/types";
import { ReviewOrderField } from "@/graphql/types";
import type { ReviewsQueryVariables } from "../graphql/operation-types";

export const reviewSortFieldMapping: SortFieldMapping<ReviewOrderField> = {
  createdAt: ReviewOrderField.CreatedAt,
  likeCount: ReviewOrderField.LikeCount,
  dislikeCount: ReviewOrderField.DislikeCount,
  isVerifiedPurchase: ReviewOrderField.VerificationStatus,
  rating: ReviewOrderField.Rating,
  reportCount: ReviewOrderField.ReportCount,
  status: ReviewOrderField.Status,
  updatedAt: ReviewOrderField.UpdatedAt,
};

export const buildReviewSearchCondition = (search: string): Partial<ApiReviewWhereInput> => ({
  _or: [{ title: { _containsi: search } }, { body: { _containsi: search } }],
});

export function buildReviewsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiReviewWhereInput, ReviewOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ReviewsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy?.map((order) => ({
      field: order.field,
      direction: order.direction,
    })) as ApiReviewOrderByInput[] | undefined,
  };
}
