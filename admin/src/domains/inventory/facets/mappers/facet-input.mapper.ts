import { slugify } from "transliteration/dist/node/src/node/index.js";
import type {
  ApiFacetCreateInput,
  ApiFacetUpdateInput,
} from "@/graphql/types";
import {
  FacetSelectionMode,
  FacetType,
  FacetUiType,
} from "@/graphql/types";

export interface FacetFormInput {
  label: string;
  slug: string;
  facetType: FacetType;
  uiType: FacetUiType;
  selectionMode: FacetSelectionMode;
}

export function getAllowedFacetUiTypes(facetType: FacetType): FacetUiType[] {
  if (facetType === FacetType.Price) {
    return [FacetUiType.Range];
  }
  if (facetType === FacetType.InStock) {
    return [FacetUiType.Boolean];
  }
  return [FacetUiType.Checkbox, FacetUiType.Radio, FacetUiType.Dropdown];
}

export function getDefaultFacetUiType(facetType: FacetType): FacetUiType {
  return getAllowedFacetUiTypes(facetType)[0];
}

export function getDefaultFacetSelectionMode(
  uiType: FacetUiType,
): FacetSelectionMode {
  return uiType === FacetUiType.Checkbox
    ? FacetSelectionMode.Multi
    : FacetSelectionMode.Single;
}

export function normalizeFacetSlug(value: string): string {
  return slugify(value.trim());
}

export function mapFacetFormToCreateInput(
  values: FacetFormInput,
  sortIndex?: number,
): ApiFacetCreateInput {
  return {
    label: values.label.trim(),
    slug: normalizeFacetSlug(values.slug),
    facetType: values.facetType,
    uiType: values.uiType,
    selectionMode: values.selectionMode,
    groupId: null,
    sortIndex,
  };
}

export function mapFacetFormToUpdateInput(
  id: string,
  values: Omit<FacetFormInput, "facetType">,
): ApiFacetUpdateInput {
  return {
    id,
    label: values.label.trim(),
    slug: normalizeFacetSlug(values.slug),
    uiType: values.uiType,
    selectionMode: values.selectionMode,
  };
}
