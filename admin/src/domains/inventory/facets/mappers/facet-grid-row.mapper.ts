import type { ITreeTableRow } from "@/hooks/use-tree-table-drag-drop";
import type { ApiFacetSwatch } from "@/graphql/types";
import { FacetType } from "@/graphql/types";
import type {
  FacetGridFields,
  FacetValueGridFields,
} from "../graphql/operation-types";

export type FacetGridRowType = "facet" | "value";
export type FacetGridRowId = `${FacetGridRowType}:${string}`;

export interface FacetGridRow extends ITreeTableRow {
  id: FacetGridRowId;
  apiId?: string;
  type: FacetGridRowType;
  parentId: FacetGridRowId | null;
  level: 0 | 1;
  sortIndex: number;
  name: string;
  slug?: string;
  facetType?: FacetGridFields["facetType"];
  uiType?: FacetGridFields["uiType"];
  selectionMode?: FacetGridFields["selectionMode"];
  lexoRank?: string;
  valuesCount?: number;
  enabledValuesCount?: number;
  linkedSourceHandlesCount?: number;
  enabled?: boolean;
  sourceHandles?: string[];
  swatchId?: string | null;
  swatch?: ApiFacetSwatch | null;
}

export function toFacetRowId(apiId: string): FacetGridRowId {
  return `facet:${apiId}`;
}

export function toFacetValueRowId(apiId: string): FacetGridRowId {
  return `value:${apiId}`;
}

export function getApiIdFromFacetGridRowId(rowId: FacetGridRowId): string {
  return rowId.replace(/^(facet|value):/, "");
}

export function isDiscreteFacetType(type: FacetType | undefined): boolean {
  return (
    type === FacetType.Tag ||
    type === FacetType.Feature ||
    type === FacetType.Option
  );
}

function getFacetRows(facet: FacetGridFields, sortIndex: number): FacetGridRow[] {
  const facetRowId = toFacetRowId(facet.id);
  const shouldRenderValues = isDiscreteFacetType(facet.facetType);
  const sortedValues = shouldRenderValues
    ? [...facet.values].sort((left, right) => left.sortIndex - right.sortIndex)
    : [];
  const linkedSourceHandlesCount = sortedValues.reduce(
    (count, value) => count + value.sourceHandles.length,
    facet.sourceHandles.length,
  );

  const facetRow: FacetGridRow = {
    id: facetRowId,
    apiId: facet.id,
    type: "facet",
    parentId: null,
    level: 0,
    sortIndex,
    lexoRank: facet.lexoRank,
    name: facet.label,
    slug: facet.slug,
    facetType: facet.facetType,
    uiType: facet.uiType,
    selectionMode: facet.selectionMode,
    valuesCount: sortedValues.length,
    enabledValuesCount: sortedValues.filter((value) => value.enabled).length,
    linkedSourceHandlesCount,
  };

  return [
    facetRow,
    ...sortedValues.map((value) => mapFacetValueToRow(value, facetRowId)),
  ];
}

function mapFacetValueToRow(
  value: FacetValueGridFields,
  parentId: FacetGridRowId,
): FacetGridRow {
  return {
    id: toFacetValueRowId(value.id),
    apiId: value.id,
    type: "value",
    parentId,
    level: 1,
    sortIndex: value.sortIndex,
    name: value.label,
    slug: value.slug,
    enabled: value.enabled,
    sourceHandles: [...value.sourceHandles],
    linkedSourceHandlesCount: value.sourceHandles.length,
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
    .flatMap((facet, index) => getFacetRows(facet, index));
}

export function getMaxRootSortIndex(rows: FacetGridRow[]): number {
  return Math.max(
    -1,
    ...rows.filter((row) => row.parentId === null).map((row) => row.sortIndex),
  );
}

export function getNextValueSortIndex(
  rows: FacetGridRow[],
  facetRowId: FacetGridRowId,
): number {
  return Math.max(
    -1,
    ...rows
      .filter((row) => row.parentId === facetRowId)
      .map((row) => row.sortIndex),
  ) + 1;
}
