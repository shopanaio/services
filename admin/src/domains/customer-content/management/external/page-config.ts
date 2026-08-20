import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type {
  ApiReviewContentExternalReferenceOrderByInput,
  ApiReviewContentExternalReferenceWhereInput,
} from "@/graphql/types";
import { ReviewContentExternalReferenceOrderField } from "@/graphql/types";
import type { ExternalReferencesQueryVariables } from "../hooks";

export const externalReferenceSortFieldMapping: SortFieldMapping<ReviewContentExternalReferenceOrderField> =
  {
    externalSystem: ReviewContentExternalReferenceOrderField.ExternalSystem,
    externalType: ReviewContentExternalReferenceOrderField.ExternalType,
    externalId: ReviewContentExternalReferenceOrderField.ExternalId,
    direction: ReviewContentExternalReferenceOrderField.Direction,
    syncStatus: ReviewContentExternalReferenceOrderField.SyncStatus,
    lastSyncedAt: ReviewContentExternalReferenceOrderField.LastSyncedAt,
    updatedAt: ReviewContentExternalReferenceOrderField.UpdatedAt,
  };

export const buildExternalReferenceSearchCondition = (
  search: string,
): Partial<ApiReviewContentExternalReferenceWhereInput> => ({
  _or: [
    { externalSystem: { _containsi: search } },
    { externalType: { _containsi: search } },
    { externalId: { _containsi: search } },
  ],
});

export function buildExternalReferencesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<
      ApiReviewContentExternalReferenceWhereInput,
      ReviewContentExternalReferenceOrderField
    >,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ExternalReferencesQueryVariables {
  return {
    ...pageConfig,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy as ApiReviewContentExternalReferenceOrderByInput[] | undefined,
  };
}
