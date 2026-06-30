import type { ApiCategoryUpdateInput, ApiFile } from "@/graphql/types";

export interface CategoryMediaFormValues {
  files: ApiFile[];
}

export function mapCategoryMediaToUpdateInput(
  values: CategoryMediaFormValues,
): ApiCategoryUpdateInput {
  return {
    media: {
      fileIds: values.files.map((file) => file.id),
    },
  };
}
