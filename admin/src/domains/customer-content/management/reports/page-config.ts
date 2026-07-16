import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type { ApiReviewContentReportOrderByInput, ApiReviewContentReportWhereInput } from "@/graphql/types";
import { ReviewContentReportOrderField } from "@/graphql/types";
import type { ContentReportsQueryVariables } from "../hooks";

export const reportSortFieldMapping: SortFieldMapping<ReviewContentReportOrderField> = {
  reason: ReviewContentReportOrderField.Reason,
  reporterCustomerId: ReviewContentReportOrderField.ReporterCustomerId,
  status: ReviewContentReportOrderField.Status,
  assignedToPrincipalId: ReviewContentReportOrderField.AssignedToPrincipalId,
  resolvedAt: ReviewContentReportOrderField.ResolvedAt,
  createdAt: ReviewContentReportOrderField.CreatedAt,
};

export const buildReportSearchCondition = (search: string): Partial<ApiReviewContentReportWhereInput> => ({
  _or: [
    { assignedToPrincipalId: { _containsi: search } },
    { resolvedByPrincipalId: { _containsi: search } },
  ],
});

export function buildReportsQueryVariables(
  pageConfig: Pick<UsePageConfigReturn<ApiReviewContentReportWhereInput, ReviewContentReportOrderField>, "first" | "after" | "last" | "before" | "where" | "orderBy">,
): ContentReportsQueryVariables {
  return { ...pageConfig, where: pageConfig.where ?? null, orderBy: pageConfig.orderBy as ApiReviewContentReportOrderByInput[] | undefined };
}
