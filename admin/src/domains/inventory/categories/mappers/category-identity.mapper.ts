import type { ApiCategoryUpdateInput } from "@/graphql/types";

export interface CategoryIdentityFormValues {
  name: string;
  handle: string;
}

export function mapCategoryIdentityToUpdateInput(
  values: CategoryIdentityFormValues,
): ApiCategoryUpdateInput {
  return {
    name: values.name.trim(),
    handle: values.handle.trim(),
  };
}
