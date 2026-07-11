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

function rowMatchesSearch(row: FacetGridRow, searchValue: string): boolean {
  const search = normalized(searchValue);
  if (!search) {
    return true;
  }

  return (
    normalized(row.name).includes(search) ||
    normalized(row.slug).includes(search) ||
    row.values.some(
      (value) =>
        normalized(value.name).includes(search) ||
        normalized(value.slug).includes(search),
    )
  );
}

function rowMatchesFilters(row: FacetGridRow, filters: IFilterValue[]): boolean {
  for (const filter of filters) {
    if (!hasActiveValue(filter)) {
      continue;
    }

    const values = valuesFromFilter(filter);

    if (filter.payloadKey === "facetType") {
      if (!values.includes(row.facetType)) {
        return false;
      }
      continue;
    }

    if (filter.payloadKey === "uiType") {
      if (!values.includes(row.uiType)) {
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
      const hasValues = (row.valuesCount ?? 0) > 0;
      if (hasValues !== expected) {
        return false;
      }
    }
  }

  return true;
}

function rowMatches(
  row: FacetGridRow,
  state: FacetPageFilterState,
): boolean {
  return (
    rowMatchesSearch(row, state.searchValue) &&
    rowMatchesFilters(row, state.filters)
  );
}

export function filterFacetGridRows(
  rows: FacetGridRow[],
  state: FacetPageFilterState,
): FacetGridRow[] {
  return rows
    .filter((row) => rowMatches(row, state))
    .sort((left, right) => left.sortIndex - right.sortIndex);
}
