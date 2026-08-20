import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type { ApiReviewContentOrderByInput, ApiReviewContentWhereInput } from "@/graphql/types";
import { ReviewContentOrderField } from "@/graphql/types";
import type { ModerationContentsQueryVariables } from "../hooks";

export const moderationSortFieldMapping: SortFieldMapping<ReviewContentOrderField> = {
  title: ReviewContentOrderField.Title,
  kind: ReviewContentOrderField.Kind,
  authorDisplayName: ReviewContentOrderField.AuthorDisplayName,
  locale: ReviewContentOrderField.Locale,
  status: ReviewContentOrderField.Status,
  reportCount: ReviewContentOrderField.ReportCount,
  updatedAt: ReviewContentOrderField.UpdatedAt,
};

export const buildModerationSearchCondition = (
  search: string,
): Partial<ApiReviewContentWhereInput> => ({
  _or: [
    { title: { _containsi: search } },
    { body: { _containsi: search } },
    { authorDisplayName: { _containsi: search } },
  ],
});

export function buildModerationQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiReviewContentWhereInput, ReviewContentOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ModerationContentsQueryVariables {
  return {
    ...pageConfig,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy as ApiReviewContentOrderByInput[] | undefined,
  };
}
