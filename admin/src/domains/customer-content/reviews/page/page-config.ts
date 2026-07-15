import type {
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import { SortDirection } from "@/graphql/types";
import type {
  ReviewOrderByInput,
  ReviewsQueryVariables,
  ReviewWhereInput,
} from "../graphql/operation-types";
import { ReviewOrderField } from "../graphql/operation-types";

export const reviewSortFieldMapping: SortFieldMapping<ReviewOrderField> = {
  createdAt: ReviewOrderField.CreatedAt,
  likeCount: ReviewOrderField.LikeCount,
  dislikeCount: ReviewOrderField.DislikeCount,
  isVerifiedPurchase: ReviewOrderField.IsVerifiedPurchase,
  rating: ReviewOrderField.Rating,
  reportedCount: ReviewOrderField.ReportedCount,
  status: ReviewOrderField.Status,
  updatedAt: ReviewOrderField.UpdatedAt,
};

export const buildReviewSearchCondition = (
  search: string,
): Partial<ReviewWhereInput> => ({
  _or: [
    { title: { _containsi: search } },
    { body: { _containsi: search } },
  ],
});

export function buildReviewsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ReviewWhereInput, ReviewOrderField>,
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
      direction: order.direction === SortDirection.Asc ? "ASC" : "DESC",
    })) as ReviewOrderByInput[] | undefined,
  };
}
