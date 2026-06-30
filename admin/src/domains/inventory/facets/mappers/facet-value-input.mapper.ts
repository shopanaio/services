import { slugify } from "transliteration/dist/node/src/node/index.js";
import type {
  ApiFacetValueCreateInput,
  ApiFacetValueUpdateInput,
} from "@/graphql/types";

export interface FacetValueFormInput {
  label: string;
  slug: string;
  enabled: boolean;
  sourceHandles: string[];
  swatchId?: string | null;
}

export function normalizeSourceHandles(sourceHandles: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawHandle of sourceHandles) {
    const handle = rawHandle.trim();
    if (!handle || seen.has(handle)) {
      continue;
    }
    seen.add(handle);
    result.push(handle);
  }

  return result;
}

export function getDuplicateSourceHandles(sourceHandles: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const rawHandle of sourceHandles) {
    const handle = rawHandle.trim();
    if (!handle) {
      continue;
    }
    if (seen.has(handle)) {
      duplicates.add(handle);
      continue;
    }
    seen.add(handle);
  }

  return [...duplicates];
}

export function normalizeFacetValueSlug(value: string): string {
  return slugify(value.trim());
}

export function mapFacetValueFormToCreateInput(
  facetId: string,
  values: FacetValueFormInput,
  sortIndex?: number,
): ApiFacetValueCreateInput {
  return {
    facetId,
    label: values.label.trim(),
    handle: normalizeFacetValueSlug(values.slug),
    enabled: values.enabled,
    swatchId: values.swatchId ?? null,
    sortIndex,
  };
}

export function mapFacetValueFormToUpdateInput(
  id: string,
  values: FacetValueFormInput,
): ApiFacetValueUpdateInput {
  return {
    id,
    label: values.label.trim(),
    handle: normalizeFacetValueSlug(values.slug),
    enabled: values.enabled,
    swatchId: values.swatchId ?? null,
  };
}

export function mapSourceHandlesToFacetValueUpdateInput(
  id: string,
  _sourceHandles: string[],
): ApiFacetValueUpdateInput {
  return {
    id,
  };
}
