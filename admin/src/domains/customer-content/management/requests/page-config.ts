import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type { ApiReviewRequestOrderByInput, ApiReviewRequestWhereInput } from "@/graphql/types";
import { ReviewRequestOrderField } from "@/graphql/types";
import type { ReviewRequestsQueryVariables } from "../hooks";

export const reviewRequestSortFieldMapping: SortFieldMapping<ReviewRequestOrderField> = {
  channel: ReviewRequestOrderField.Channel,
  status: ReviewRequestOrderField.Status,
  locale: ReviewRequestOrderField.Locale,
  scheduledAt: ReviewRequestOrderField.ScheduledAt,
  attemptCount: ReviewRequestOrderField.AttemptCount,
  createdAt: ReviewRequestOrderField.CreatedAt,
};

export const buildReviewRequestSearchCondition = (search: string): Partial<ApiReviewRequestWhereInput> => ({
  _or: [
    { providerMessageId: { _containsi: search } },
    { sourceChannel: { _containsi: search } },
    { locale: { _containsi: search } },
  ],
});

export function buildReviewRequestsQueryVariables(
  pageConfig: Pick<UsePageConfigReturn<ApiReviewRequestWhereInput, ReviewRequestOrderField>, "first" | "after" | "last" | "before" | "where" | "orderBy">,
): ReviewRequestsQueryVariables {
  return { ...pageConfig, where: pageConfig.where ?? null, orderBy: pageConfig.orderBy as ApiReviewRequestOrderByInput[] | undefined };
}
