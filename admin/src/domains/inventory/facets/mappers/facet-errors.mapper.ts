import type { ApiGenericUserError } from "@/graphql/types";

export interface FacetFormError {
  field: string | null;
  message: string;
}

const FIELD_ALIASES: Record<string, string> = {
  label: "label",
  slug: "slug",
  uiType: "uiType",
  selectionMode: "selectionMode",
  facetType: "facetType",
  sourceHandles: "sourceHandles",
  enabled: "enabled",
  swatchId: "swatchId",
};

export function mapFacetUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): FacetFormError[] {
  return errors.map((error) => {
    const field = error.field?.at(-1) ?? null;
    return {
      field: field ? FIELD_ALIASES[field] ?? field : null,
      message: error.message,
    };
  });
}

export function getFirstUserErrorMessage(
  errors: ApiGenericUserError[],
  fallback: string,
): string {
  return errors[0]?.message ?? fallback;
}
