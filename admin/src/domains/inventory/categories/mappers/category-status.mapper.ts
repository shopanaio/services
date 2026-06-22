import { CategoryStatus } from "@/graphql/types";
import type { ApiCategoryUpdateInput } from "@/graphql/types";

export interface CategoryStatusFormValues {
  isPublished: boolean;
}

export function mapCategoryStatusToUpdateInput(
  values: CategoryStatusFormValues,
): ApiCategoryUpdateInput {
  return {
    status: values.isPublished
      ? CategoryStatus.Published
      : CategoryStatus.Draft,
  };
}
