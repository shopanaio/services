import type { IFilterValue } from "@/layouts/filters/core/types";
import type { FacetGridRow } from "../mappers";

export interface FacetPageFilterState {
  searchValue: string;
  filters: IFilterValue[];
}

function normalized(value: string | undefined | null): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function valuesFromFilter(filter: IFilterValue): unknown[] {
  return Array.isArray(filter.value) ? filter.value : [filter.value];
}

function hasActiveValue(filter: IFilterValue): boolean {
  return valuesFromFilter(filter).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function getParentFacet(
  row: FacetGridRow,
  rowsById: Map<string, FacetGridRow>,
): FacetGridRow {
  if (row.type === "facet") {
    return row;
  }
  return (row.parentId ? rowsById.get(row.parentId) : null) ?? row;
}

function rowMatchesSearch(row: FacetGridRow, searchValue: string): boolean {
  const search = normalized(searchValue);
  if (!search) {
    return true;
  }

  return (
    normalized(row.name).includes(search) || normalized(row.slug).includes(search)
  );
}

function rowMatchesFilters(
  row: FacetGridRow,
  rowsById: Map<string, FacetGridRow>,
  filters: IFilterValue[],
): boolean {
  const parentFacet = getParentFacet(row, rowsById);

  for (const filter of filters) {
    if (!hasActiveValue(filter)) {
      continue;
    }

    const values = valuesFromFilter(filter);

    if (filter.payloadKey === "facetType") {
      if (!values.includes(parentFacet.facetType)) {
        return false;
      }
      continue;
    }

    if (filter.payloadKey === "uiType") {
      if (!values.includes(parentFacet.uiType)) {
        return false;
      }
      continue;
    }

    if (filter.payloadKey === "hasValues") {
      const [rawValue] = values;
      const expected =
        typeof rawValue === "boolean"
          ? rawValue
          : String(rawValue).toLocaleLowerCase() === "true";
      const hasValues = (parentFacet.valuesCount ?? 0) > 0;
      if (hasValues !== expected) {
        return false;
      }
    }
  }

  return true;
}

function rowMatches(
  row: FacetGridRow,
  rowsById: Map<string, FacetGridRow>,
  state: FacetPageFilterState,
): boolean {
  return (
    rowMatchesSearch(row, state.searchValue) &&
    rowMatchesFilters(row, rowsById, state.filters)
  );
}

export function filterFacetGridRows(
  rows: FacetGridRow[],
  state: FacetPageFilterState,
): FacetGridRow[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const result: FacetGridRow[] = [];
  const facets = rows
    .filter((row) => row.type === "facet")
    .sort((left, right) => left.sortIndex - right.sortIndex);

  for (const facet of facets) {
    const children = rows
      .filter((row) => row.parentId === facet.id)
      .sort((left, right) => left.sortIndex - right.sortIndex);
    const facetMatches = rowMatches(facet, rowsById, state);
    const matchingChildren = children.filter((child) =>
      rowMatches(child, rowsById, state),
    );

    if (!facetMatches && matchingChildren.length === 0) {
      continue;
    }

    result.push(facet);
    result.push(...(facetMatches ? children : matchingChildren));
  }

  return result;
}
