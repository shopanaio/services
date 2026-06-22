import type { ApiCategoryUpdateInput } from "@/graphql/types";

export interface CategoryHierarchyFormValues {
  parentId: string | null;
}

export function mapCategoryHierarchyToUpdateInput(
  values: CategoryHierarchyFormValues,
): ApiCategoryUpdateInput {
  return {
    hierarchy: {
      parentId: values.parentId,
    },
  };
}
