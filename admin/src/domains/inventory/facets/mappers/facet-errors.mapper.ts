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
  sources: "sources",
  source: "source",
  sourceHandles: "sourceHandles",
  valueCandidates: "valueCandidates",
  enabled: "enabled",
  swatchId: "swatchId",
};

export function mapFacetUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): FacetFormError[] {
  return errors.map((error) => {
    const fieldPath = error.field ?? [];
    const field = fieldPath.includes("sources")
      ? "sources"
      : fieldPath.includes("valueCandidates")
        ? "valueCandidates"
        : fieldPath.at(-1) ?? null;
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
