import type { FacetGridRow } from "../mappers";

export function getExpandedFacetIds(rows: FacetGridRow[]): Set<string> {
  return new Set(
    rows.filter((row) => row.type === "facet").map((row) => row.id),
  );
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
