import type { ApiCategoryUpdateInput } from "@/graphql/types";
import type { ProductSortBy, SortDirection } from "@/graphql/types";

export interface CategorySortFormValues {
  defaultSort: ProductSortBy;
  defaultSortDirection: SortDirection;
}

export function mapCategorySortToUpdateInput(
  values: CategorySortFormValues,
): ApiCategoryUpdateInput {
  return {
    sort: {
      defaultSort: values.defaultSort,
      defaultSortDirection: values.defaultSortDirection,
    },
  };
}
