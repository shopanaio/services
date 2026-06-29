import type { FacetGridRow } from "../mappers";

export function areFacetRowsSame(
  left: FacetGridRow[],
  right: FacetGridRow[],
): boolean {
  return (
    left.length === right.length &&
    left.every((row, index) => row === right[index])
  );
}

export function areSetsEqual<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const item of left) {
    if (!right.has(item)) {
      return false;
    }
  }

  return true;
}

export function getExpandedFacetIds(rows: FacetGridRow[]): Set<string> {
  return new Set(
    rows.filter((row) => row.type === "facet").map((row) => row.id),
  );
}

export function getSyncedExpandedFacetIds(
  rows: FacetGridRow[],
  current: Set<string>,
): Set<string> {
  const next = new Set(current);
  const currentRowIds = new Set<string>(rows.map((row) => row.id));

  for (const rowId of next) {
    if (!currentRowIds.has(rowId)) {
      next.delete(rowId);
    }
  }

  for (const row of rows) {
    if (row.type === "facet" && row.valuesCount && row.valuesCount > 0) {
      next.add(row.id);
    }
  }

  return next;
}

export function buildFacetVisibleRows(
  rows: FacetGridRow[],
  expandedIds: Set<string>,
): FacetGridRow[] {
  const result: FacetGridRow[] = [];
  const rootRows = rows
    .filter((row) => row.parentId === null)
    .sort((left, right) => left.sortIndex - right.sortIndex);

  for (const row of rootRows) {
    result.push(row);

    if (expandedIds.has(row.id)) {
      result.push(
        ...rows
          .filter((candidate) => candidate.parentId === row.id)
          .sort((left, right) => left.sortIndex - right.sortIndex),
      );
    }
  }

  return result;
}

export function getFacetRowClass(params: {
  data: FacetGridRow | undefined;
}): string {
  if (!params.data) {
    return "";
  }

  return params.data.type === "facet" ? "row-group" : "row-child";
}
