"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RowDragEndEvent, RowDragEnterEvent } from "ag-grid-community";
import type { FacetGridRow } from "../mappers";
import type { FacetOrderEdit } from "../mappers/facet-order.mapper";
import {
  buildFacetVisibleRows,
  getExpandedFacetIds,
  getFacetRowClass,
} from "./facet-flat-tree";

interface UseFacetOrderTreeRowsOptions {
  initialRows: FacetGridRow[];
  onFacetOrderEdit: (rowId: string, edit: FacetOrderEdit) => void;
  onInvalidMove: (message: string) => void;
  valueDragMode?: "disabled";
}

export function useFacetOrderTreeRows({
  initialRows,
  onFacetOrderEdit,
  onInvalidMove,
}: UseFacetOrderTreeRowsOptions) {
  const [allRows, setAllRows] = useState<FacetGridRow[]>(initialRows);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getExpandedFacetIds(initialRows),
  );
  const originalRowsRef = useRef<FacetGridRow[]>(initialRows);
  const expandedBeforeDragRef = useRef<Set<string> | null>(null);
  const draggingRowIdRef = useRef<string | null>(null);

  useEffect(() => {
    originalRowsRef.current = initialRows;
    setAllRows(initialRows);
    setExpandedIds(getExpandedFacetIds(initialRows));
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

  const handleRowDragEnter = useCallback(
    (event: RowDragEnterEvent<FacetGridRow>) => {
      const movingData = event.node?.data;
      if (!movingData) {
        return;
      }

      if (movingData.type !== "facet") {
        onInvalidMove("Facet values can only be reordered inside their facet");
        return;
      }

      if (draggingRowIdRef.current === movingData.id) {
        return;
      }

      draggingRowIdRef.current = movingData.id;
      expandedBeforeDragRef.current = new Set(expandedIds);
      setExpandedIds(new Set());
    },
    [expandedIds, onInvalidMove],
  );

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<FacetGridRow>) => {
      const savedExpandedIds = expandedBeforeDragRef.current;
      draggingRowIdRef.current = null;
      expandedBeforeDragRef.current = null;

      const movingData = event.node?.data;
      if (!movingData || movingData.type !== "facet") {
        if (savedExpandedIds) {
          setExpandedIds(savedExpandedIds);
        }
        onInvalidMove("Facet values can only be reordered inside their facet");
        return;
      }

      const visualRows: FacetGridRow[] = [];
      event.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) {
          visualRows.push(node.data);
        }
      });

      if (visualRows.some((row) => row.type !== "facet")) {
        if (savedExpandedIds) {
          setExpandedIds(savedExpandedIds);
        }
        setAllRows(originalRowsRef.current);
        onInvalidMove("Facet values can only be reordered inside their facet");
        return;
      }

      const nextSortIndexByFacetId = new Map<string, number>();
      visualRows.forEach((row) => {
        nextSortIndexByFacetId.set(row.id, nextSortIndexByFacetId.size);
      });

      setAllRows((currentRows) =>
        currentRows.map((row) =>
          row.type === "facet" && nextSortIndexByFacetId.has(row.id)
            ? { ...row, sortIndex: nextSortIndexByFacetId.get(row.id)! }
            : row,
        ),
      );

      for (const [rowId, sortIndex] of nextSortIndexByFacetId.entries()) {
        const originalRow = originalRowsRef.current.find(
          (row) => row.id === rowId,
        );
        if (!originalRow) {
          continue;
        }

        onFacetOrderEdit(rowId, {
          rowKind: "facet",
          parentId: null,
          originalParentId: originalRow.parentId,
          originalSortIndex: originalRow.sortIndex,
          sortIndex,
        });
      }

      if (savedExpandedIds) {
        setExpandedIds(savedExpandedIds);
      }
    },
    [onFacetOrderEdit, onInvalidMove],
  );

  const resetRows = useCallback((nextRows: FacetGridRow[]) => {
    originalRowsRef.current = nextRows;
    setAllRows(nextRows);
    setExpandedIds(getExpandedFacetIds(nextRows));
  }, []);

  const getRowClass = useCallback(getFacetRowClass, []);

  return {
    allRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    handleRowDragEnter,
    handleRowDragEnd,
    resetRows,
    getRowClass,
  };
}
