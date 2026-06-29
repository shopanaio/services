"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FacetGridRow } from "../mappers";
import {
  areFacetRowsSame,
  areSetsEqual,
  buildFacetVisibleRows,
  getExpandedFacetIds,
  getFacetRowClass,
  getSyncedExpandedFacetIds,
} from "./facet-flat-tree";

export function useFacetTreeRows(initialRows: FacetGridRow[]) {
  const [allRows, setAllRows] = useState<FacetGridRow[]>(initialRows);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getExpandedFacetIds(initialRows),
  );

  useEffect(() => {
    setAllRows((current) =>
      areFacetRowsSame(current, initialRows) ? current : initialRows,
    );
    setExpandedIds((current) => {
      const next = getSyncedExpandedFacetIds(initialRows, current);
      return areSetsEqual(current, next) ? current : next;
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
    setExpandedIds((current) => {
      if (current.has(id)) {
        return current;
      }
      return new Set([...current, id]);
    });
  }, []);

  const collapseFacet = useCallback((id: string) => {
    setExpandedIds((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const resetRowsFromServer = useCallback((nextRows: FacetGridRow[]) => {
    setAllRows((current) =>
      areFacetRowsSame(current, nextRows) ? current : nextRows,
    );
    setExpandedIds((current) => {
      const next = getExpandedFacetIds(nextRows);
      return areSetsEqual(current, next) ? current : next;
    });
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
