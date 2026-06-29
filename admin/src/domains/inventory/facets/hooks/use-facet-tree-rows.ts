"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FacetGridRow } from "../mappers";
import {
  buildFacetVisibleRows,
  getExpandedFacetIds,
  getFacetRowClass,
} from "./facet-flat-tree";

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
    () => buildFacetVisibleRows(allRows, expandedIds),
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

  const getRowClass = useCallback(getFacetRowClass, []);

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
