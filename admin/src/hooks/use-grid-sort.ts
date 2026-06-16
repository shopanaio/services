"use client";

import { useState, useCallback, RefObject } from "react";
import type {
  GridApi,
  SortChangedEvent,
  ColumnState,
  SortDirection,
} from "ag-grid-community";
import type { AgGridReact } from "ag-grid-react";

export interface SortModel {
  colId: string;
  sort: SortDirection;
  sortIndex?: number;
}

export interface UseGridSortOptions<T = unknown> {
  /** Grid ref for programmatic control */
  gridRef?: RefObject<AgGridReact<T> | null>;
  /** Initial sort configuration */
  initialSort?: SortModel[];
  /** Callback fired when sort changes - use for API calls */
  onSortChange?: (sortModel: SortModel[]) => void;
  /** Controlled sort state (makes component controlled) */
  sortModel?: SortModel[];
}

export interface UseGridSortReturn {
  /** Current sort model */
  sortModel: SortModel[];
  /** Callback to pass to AgGridReact onSortChanged */
  onSortChanged: (event: SortChangedEvent) => void;
  /** Set sort for a single column (clears other sorts) */
  setSortColumn: (colId: string, sort: SortDirection) => void;
  /** Add or update sort for a column (multi-sort) */
  addSortColumn: (colId: string, sort: SortDirection) => void;
  /** Remove sort from a specific column */
  removeSortColumn: (colId: string) => void;
  /** Clear all sorting */
  clearSort: () => void;
  /** Set complete sort model */
  setSortModel: (model: SortModel[]) => void;
  /** Check if a column is sorted */
  isColumnSorted: (colId: string) => boolean;
  /** Get sort direction for a column */
  getColumnSort: (colId: string) => SortDirection | undefined;
}

/**
 * Hook for managing AG Grid sorting with declarative API
 *
 * @example
 * // Basic usage with callback
 * const gridRef = useRef<AgGridReact>(null);
 * const { onSortChanged, sortModel } = useGridSort({
 *   gridRef,
 *   initialSort: [{ colId: 'name', sort: 'asc' }],
 *   onSortChange: (model) => {
 *     fetchData({ sort: model });
 *   },
 * });
 *
 * @example
 * // Programmatic control
 * const { setSortColumn, clearSort } = useGridSort({ gridRef });
 *
 * // Sort by name ascending
 * setSortColumn('name', 'asc');
 *
 * // Multi-column sort
 * addSortColumn('country', 'desc');
 *
 * // Clear all
 * clearSort();
 */
export function useGridSort<T = unknown>(
  options: UseGridSortOptions<T> = {}
): UseGridSortReturn {
  const {
    gridRef,
    initialSort = [],
    onSortChange,
    sortModel: controlledSort,
  } = options;

  const [internalSort, setInternalSort] = useState<SortModel[]>(initialSort);

  // Use controlled or internal state
  const isControlled = controlledSort !== undefined;
  const sortModel = isControlled ? controlledSort : internalSort;

  // Get grid API from ref
  const getApi = useCallback((): GridApi | null => {
    return gridRef?.current?.api ?? null;
  }, [gridRef]);

  // Extract sort model from column state
  const extractSortModel = useCallback(
    (columnState: ColumnState[]): SortModel[] => {
      return columnState
        .filter((col) => col.sort != null)
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .map((col) => ({
          colId: col.colId!,
          sort: col.sort!,
          sortIndex: col.sortIndex ?? undefined,
        }));
    },
    []
  );

  // Apply sort model to grid
  const applyToGrid = useCallback((model: SortModel[]) => {
    const api = getApi();
    if (!api) return;

    const state = model.map((item, index) => ({
      colId: item.colId,
      sort: item.sort,
      sortIndex: index,
    }));

    api.applyColumnState({
      state,
      defaultState: { sort: null },
    });
  }, [getApi]);

  // Update sort state and notify
  const updateSort = useCallback(
    (newModel: SortModel[], skipGridUpdate = false) => {
      if (!isControlled) {
        setInternalSort(newModel);
      }

      if (!skipGridUpdate) {
        applyToGrid(newModel);
      }

      onSortChange?.(newModel);
    },
    [isControlled, applyToGrid, onSortChange]
  );

  // Handle sort changed event from grid
  const onSortChanged = useCallback(
    (event: SortChangedEvent) => {
      const columnState = event.api.getColumnState();
      const newModel = extractSortModel(columnState);

      // Skip grid update since it came from the grid
      updateSort(newModel, true);
    },
    [extractSortModel, updateSort]
  );

  // Set sort for single column (replaces existing)
  const setSortColumn = useCallback(
    (colId: string, sort: SortDirection) => {
      const newModel: SortModel[] = sort ? [{ colId, sort }] : [];
      updateSort(newModel);
    },
    [updateSort]
  );

  // Add or update sort column (multi-sort)
  const addSortColumn = useCallback(
    (colId: string, sort: SortDirection) => {
      const existing = sortModel.filter((s) => s.colId !== colId);

      if (!sort) {
        updateSort(existing);
        return;
      }

      const newModel = [
        ...existing,
        { colId, sort, sortIndex: existing.length },
      ];
      updateSort(newModel);
    },
    [sortModel, updateSort]
  );

  // Remove sort from column
  const removeSortColumn = useCallback(
    (colId: string) => {
      const newModel = sortModel
        .filter((s) => s.colId !== colId)
        .map((s, index) => ({ ...s, sortIndex: index }));
      updateSort(newModel);
    },
    [sortModel, updateSort]
  );

  // Clear all sorting
  const clearSort = useCallback(() => {
    updateSort([]);
  }, [updateSort]);

  // Set complete sort model
  const setSortModel = useCallback(
    (model: SortModel[]) => {
      updateSort(model);
    },
    [updateSort]
  );

  // Check if column is sorted
  const isColumnSorted = useCallback(
    (colId: string): boolean => {
      return sortModel.some((s) => s.colId === colId);
    },
    [sortModel]
  );

  // Get column sort direction
  const getColumnSort = useCallback(
    (colId: string): SortDirection | undefined => {
      return sortModel.find((s) => s.colId === colId)?.sort;
    },
    [sortModel]
  );

  return {
    sortModel,
    onSortChanged,
    setSortColumn,
    addSortColumn,
    removeSortColumn,
    clearSort,
    setSortModel,
    isColumnSorted,
    getColumnSort,
  };
}
