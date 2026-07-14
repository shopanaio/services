import type { ApiFacetSwatch } from "@/graphql/types";
import { FacetType } from "@/graphql/types";
import type {
  FacetGridFields,
  FacetValueGridFields,
} from "../graphql/operation-types";

export type FacetGridRowId = `facet:${string}`;

export interface FacetGridValue {
  id: string;
  apiId: string;
  sortIndex: number;
  name: string;
  slug?: string;
  enabled?: boolean;
  sourceHandles: string[];
  linkedSourceHandlesCount: number;
  swatchId?: string | null;
  swatch?: ApiFacetSwatch | null;
}

export interface FacetGridRow {
  id: FacetGridRowId;
  apiId: string;
  sortIndex: number;
  name: string;
  slug?: string;
  facetType?: FacetGridFields["facetType"];
  uiType?: FacetGridFields["uiType"];
  selectionMode?: FacetGridFields["selectionMode"];
  scopes: FacetGridFields["scopes"];
  lexoRank?: string;
  valuesCount?: number;
  enabledValuesCount?: number;
  linkedSourceHandlesCount?: number;
  values: FacetGridValue[];
}

export function toFacetRowId(apiId: string): FacetGridRowId {
  return `facet:${apiId}`;
}

export function isDiscreteFacetType(type: FacetType | undefined): boolean {
  return (
    type === FacetType.Tag ||
    type === FacetType.Feature ||
    type === FacetType.Option
  );
}

function getFacetRow(facet: FacetGridFields, sortIndex: number): FacetGridRow {
  const facetRowId = toFacetRowId(facet.id);
  const shouldRenderValues = isDiscreteFacetType(facet.facetType);
  const sortedValues = shouldRenderValues
    ? [...facet.values].sort((left, right) => left.sortIndex - right.sortIndex)
    : [];
  const values = sortedValues.map(mapFacetValueToGridValue);
  const linkedSourceHandlesCount = sortedValues.reduce(
    (count, value) => count + getFacetValueSourceHandles(value).length,
    0,
  );

  return {
    id: facetRowId,
    apiId: facet.id,
    sortIndex,
    lexoRank: facet.lexoRank,
    name: facet.label,
    slug: facet.slug,
    facetType: facet.facetType,
    uiType: facet.uiType,
    selectionMode: facet.selectionMode,
    scopes: facet.scopes,
    valuesCount: sortedValues.length,
    enabledValuesCount: sortedValues.filter((value) => value.enabled).length,
    linkedSourceHandlesCount,
    values,
  };
}

function getFacetValueSourceHandles(value: FacetValueGridFields): string[] {
  return value.sourceValues.map((sourceValue) => sourceValue.handle);
}

function mapFacetValueToGridValue(
  value: FacetValueGridFields,
): FacetGridValue {
  const sourceHandles = getFacetValueSourceHandles(value);

  return {
    id: value.id,
    apiId: value.id,
    sortIndex: value.sortIndex,
    name: value.label,
    slug: value.handle,
    enabled: value.enabled,
    sourceHandles,
    linkedSourceHandlesCount: sourceHandles.length,
    swatchId: value.swatch?.id ?? null,
    swatch: value.swatch as ApiFacetSwatch | null,
  };
}

export function apiFacetsToFacetGridRows(
  facets: FacetGridFields[],
): FacetGridRow[] {
  return [...facets]
    .sort((left, right) => {
      const rank = left.lexoRank.localeCompare(right.lexoRank);
      return rank === 0 ? left.id.localeCompare(right.id) : rank;
    })
    .map((facet, index) => getFacetRow(facet, index));
}

export function getMaxRootSortIndex(rows: FacetGridRow[]): number {
  return Math.max(-1, ...rows.map((row) => row.sortIndex));
}
