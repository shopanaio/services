import type { ApiCategoryUpdateInput, ApiFile } from "@/graphql/types";

export interface CategorySeoFormValues {
  seoTitle: string;
  seoDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: ApiFile | null;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function mapCategorySeoToUpdateInput(
  values: CategorySeoFormValues,
): ApiCategoryUpdateInput {
  return {
    seo: {
      seoTitle: emptyToNull(values.seoTitle),
      seoDescription: emptyToNull(values.seoDescription),
      ogTitle: emptyToNull(values.ogTitle),
      ogDescription: emptyToNull(values.ogDescription),
      ogImageId: values.ogImage?.id ?? null,
    },
  };
}
