import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type {
  ApiReviewModerationCaseOrderByInput,
  ApiReviewModerationCaseWhereInput,
} from "@/graphql/types";
import { ReviewModerationCaseOrderField } from "@/graphql/types";
import type { ModerationCasesQueryVariables } from "../hooks";

export const moderationCaseSortFieldMapping: SortFieldMapping<ReviewModerationCaseOrderField> = {
  reasonCode: ReviewModerationCaseOrderField.ReasonCode,
  priority: ReviewModerationCaseOrderField.Priority,
  status: ReviewModerationCaseOrderField.Status,
  assignedToPrincipalId: ReviewModerationCaseOrderField.AssignedToPrincipalId,
  dueAt: ReviewModerationCaseOrderField.DueAt,
  createdAt: ReviewModerationCaseOrderField.CreatedAt,
};

export const buildModerationCaseSearchCondition = (
  search: string,
): Partial<ApiReviewModerationCaseWhereInput> => ({
  _or: [
    { reasonCode: { _containsi: search } },
    { assignedToPrincipalId: { _containsi: search } },
    { resolutionCode: { _containsi: search } },
  ],
});

export function buildModerationCasesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiReviewModerationCaseWhereInput, ReviewModerationCaseOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ModerationCasesQueryVariables {
  return {
    ...pageConfig,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy as ApiReviewModerationCaseOrderByInput[] | undefined,
  };
}
