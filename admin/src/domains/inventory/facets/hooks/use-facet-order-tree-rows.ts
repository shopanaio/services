"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTreeTableDragDrop } from "@/hooks";
import type { FacetGridRow } from "../mappers";
import type { FacetOrderEdit } from "../mappers/facet-order.mapper";
import { areFacetRowsSame } from "./facet-flat-tree";

interface UseFacetOrderTreeRowsOptions {
  initialRows: FacetGridRow[];
  onFacetOrderEdit: (rowId: string, edit: FacetOrderEdit) => void;
  onInvalidMove: (message: string) => void;
  valueDragMode?: "disabled" | "same-facet";
}

export function useFacetOrderTreeRows({
  initialRows,
  onFacetOrderEdit,
  onInvalidMove,
}: UseFacetOrderTreeRowsOptions) {
  const originalRowsRef = useRef<FacetGridRow[]>(initialRows);
  const setAllRowsRef =
    useRef<Dispatch<SetStateAction<FacetGridRow[]>> | null>(null);

  const handleRowsChange = useCallback(
    (nextRows: FacetGridRow[]) => {
      const invalidValueMove = nextRows.some((row) => {
        if (row.type !== "value") {
          return false;
        }
        const originalRow = originalRowsRef.current.find(
          (candidate) => candidate.id === row.id,
        );
        return !originalRow || row.parentId !== originalRow.parentId;
      });

      if (invalidValueMove) {
        queueMicrotask(() => {
          setAllRowsRef.current?.(originalRowsRef.current);
        });
        onInvalidMove("Facet values can only be reordered inside their facet");
        return;
      }

      for (const row of nextRows) {
        if (row.type !== "facet" && row.type !== "value") {
          continue;
        }
        const originalRow = originalRowsRef.current.find(
          (candidate) => candidate.id === row.id,
        );
        if (!originalRow) {
          continue;
        }

        onFacetOrderEdit(row.id, {
          rowKind: row.type,
          parentId: row.parentId,
          originalParentId: originalRow.parentId,
          originalSortIndex: originalRow.sortIndex,
          sortIndex: row.sortIndex,
        });
      }
    },
    [onFacetOrderEdit, onInvalidMove],
  );

  const {
    allRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    handleRowDragEnter,
    handleRowDragEnd,
    getRowClass,
    setAllRows,
  } = useTreeTableDragDrop<FacetGridRow>({
    initialRows,
    groupType: "facet",
    onRowsChange: handleRowsChange,
  });

  useEffect(() => {
    setAllRowsRef.current = setAllRows;
  }, [setAllRows]);

  useEffect(() => {
    if (!areFacetRowsSame(originalRowsRef.current, initialRows)) {
      originalRowsRef.current = initialRows;
    }
    setAllRows((current) =>
      areFacetRowsSame(current, initialRows) ? current : initialRows,
    );
  }, [initialRows, setAllRows]);

  const resetRows = useCallback((nextRows: FacetGridRow[]) => {
    originalRowsRef.current = nextRows;
    setAllRows((current) =>
      areFacetRowsSame(current, nextRows) ? current : nextRows,
    );
  }, [setAllRows]);

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
