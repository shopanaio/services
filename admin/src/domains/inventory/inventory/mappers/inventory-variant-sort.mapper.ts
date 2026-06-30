import type { ApiVariantOrderByInput } from "@/graphql/types";
import {
  SortDirection as ApiSortDirection,
  VariantOrderField,
} from "@/graphql/types";
import type { SortModel } from "@/hooks/use-grid-sort";

const SUPPORTED_SORT_FIELDS: Record<string, VariantOrderField> = {
  variantId: VariantOrderField.Id,
  isDefault: VariantOrderField.IsDefault,
  createdAt: VariantOrderField.CreatedAt,
  updatedAt: VariantOrderField.UpdatedAt,
  externalSystem: VariantOrderField.ExternalSystem,
  externalId: VariantOrderField.ExternalId,
};

const PRODUCT_FIRST_SORT: ApiVariantOrderByInput = {
  field: VariantOrderField.ProductId,
  direction: ApiSortDirection.Asc,
};

const FALLBACK_VARIANT_SORT: ApiVariantOrderByInput = {
  field: VariantOrderField.Id,
  direction: ApiSortDirection.Asc,
};

function toApiSortDirection(sort: SortModel["sort"]): ApiSortDirection {
  return sort === "desc" ? ApiSortDirection.Desc : ApiSortDirection.Asc;
}

export function mapInventoryVariantSortModelToOrderBy(
  sortModel: SortModel[],
): ApiVariantOrderByInput[] {
  const activeSort = sortModel
    .map((sort): ApiVariantOrderByInput | null => {
      const field = SUPPORTED_SORT_FIELDS[sort.colId];

      if (!field) {
        return null;
      }

      return {
        field,
        direction: toApiSortDirection(sort.sort),
      };
    })
    .find((sort): sort is ApiVariantOrderByInput => sort !== null);

  return [PRODUCT_FIRST_SORT, activeSort ?? FALLBACK_VARIANT_SORT];
}
