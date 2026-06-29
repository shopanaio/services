"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FacetGridRow } from "../mappers";

function getExpandedFacetIds(rows: FacetGridRow[]): Set<string> {
  return new Set(
    rows.filter((row) => row.type === "facet").map((row) => row.id),
  );
}

function buildVisibleRows(
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

export function useFacetTreeRows(initialRows: FacetGridRow[]) {
  const [allRows, setAllRows] = useState<FacetGridRow[]>(initialRows);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getExpandedFacetIds(initialRows),
  );

  useEffect(() => {
    setAllRows(initialRows);
    setExpandedIds((current) => {
      const next = new Set(current);
      const currentRowIds = new Set<string>(initialRows.map((row) => row.id));
      for (const rowId of next) {
        if (!currentRowIds.has(rowId)) {
          next.delete(rowId);
        }
      }
      for (const row of initialRows) {
        if (row.type === "facet" && row.valuesCount && row.valuesCount > 0) {
          next.add(row.id);
        }
      }
      return next;
    });
  }, [initialRows]);

  const visibleRows = useMemo(
    () => buildVisibleRows(allRows, expandedIds),
    [allRows, expandedIds],
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandFacet = useCallback((id: string) => {
    setExpandedIds((current) => new Set([...current, id]));
  }, []);

  const collapseFacet = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const resetRowsFromServer = useCallback((nextRows: FacetGridRow[]) => {
    setAllRows(nextRows);
    setExpandedIds(getExpandedFacetIds(nextRows));
  }, []);

  const getRowClass = useCallback((params: { data: FacetGridRow | undefined }) => {
    if (!params.data) {
      return "";
    }
    return params.data.type === "facet" ? "row-group" : "row-child";
  }, []);

  return {
    allRows,
    setAllRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    expandFacet,
    collapseFacet,
    resetRowsFromServer,
    getRowClass,
  };
}
