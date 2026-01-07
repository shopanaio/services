import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ICellSelectionApi,
  ICellSelectionConfig,
  ICellSelectionHandlers,
} from "./types";
import {
  createCellSelectionStore,
  CellSelectionStore,
} from "./useCellSelectionStore";
import { SELECTING_BODY_CLASS } from "./styles";

interface UseCellSelectionResult {
  api: ICellSelectionApi;
  handlers: ICellSelectionHandlers;
  store: CellSelectionStore;
}

/**
 * Main hook for cell selection functionality
 * Creates and manages the selection store and provides handlers
 */
export const useCellSelection = <TData = unknown>(
  gridRef: RefObject<AgGridReact<TData> | null>,
  config: ICellSelectionConfig = {}
): UseCellSelectionResult => {
  const {
    singleColumnOnly = true,
    selectableColumns,
    onSelectionChange,
    getCellValue,
    setCellValue,
  } = config;

  // Create isolated store for this grid instance
  const storeRef = useRef<CellSelectionStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCellSelectionStore();
  }
  const store = storeRef.current;

  // Get visible row IDs from AG Grid
  const getVisibleRowIds = useCallback((): string[] => {
    const api = gridRef.current?.api;
    if (!api) return [];

    const rowIds: string[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      const data = node.data as Record<string, unknown> | undefined;
      if (data && typeof data === "object" && "id" in data) {
        rowIds.push(data.id as string);
      }
    });
    return rowIds;
  }, [gridRef]);

  // Check if column is selectable
  const isColumnSelectable = useCallback(
    (field: string): boolean => {
      if (!selectableColumns) return true;
      return selectableColumns.includes(field);
    },
    [selectableColumns]
  );

  // Subscribe to selection changes
  useEffect(() => {
    if (!onSelectionChange) return;

    const unsubscribe = store.subscribe((state) => {
      onSelectionChange(state.selectedCells);
    });

    return unsubscribe;
  }, [store, onSelectionChange]);

  // Handle body class for preventing text selection during drag
  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      if (state.isSelecting) {
        document.body.classList.add(SELECTING_BODY_CLASS);
      } else {
        document.body.classList.remove(SELECTING_BODY_CLASS);
      }
    });

    return () => {
      unsubscribe();
      document.body.classList.remove(SELECTING_BODY_CLASS);
    };
  }, [store]);

  // Global mouseup listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      const state = store.getState();
      if (state.isSelecting) {
        state.endSelection();
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [store]);

  // Mouse down handler
  const handleMouseDown = useCallback(
    (rowId: string, field: string, event: React.MouseEvent) => {
      if (event.button !== 0) return; // Only left click
      if (!isColumnSelectable(field)) return;

      const state = store.getState();

      if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd + Click - toggle single cell
        if (singleColumnOnly && state.activeColumn && state.activeColumn !== field) {
          // Different column in single column mode - start fresh
          state.startSelection(rowId, field);
        } else {
          state.toggleCell(rowId, field);
        }
      } else if (event.shiftKey && state.selectionAnchor) {
        // Shift + Click - select range
        if (singleColumnOnly && state.activeColumn !== field) {
          // Different column - start fresh
          state.startSelection(rowId, field);
        } else {
          state.selectRange(rowId, getVisibleRowIds());
        }
      } else {
        // Regular click - start new selection
        state.startSelection(rowId, field);
      }
    },
    [store, getVisibleRowIds, isColumnSelectable, singleColumnOnly]
  );

  // Mouse enter handler (for drag selection)
  const handleMouseEnter = useCallback(
    (rowId: string, field: string) => {
      const state = store.getState();
      if (!state.isSelecting) return;
      if (!isColumnSelectable(field)) return;

      // In single column mode, only extend if same column
      if (singleColumnOnly && state.activeColumn !== field) return;

      state.extendSelection(rowId, getVisibleRowIds());
    },
    [store, getVisibleRowIds, isColumnSelectable, singleColumnOnly]
  );

  // API methods
  const api = useMemo((): ICellSelectionApi => {
    return {
      get selectedCells() {
        return store.getState().selectedCells;
      },

      get activeColumn() {
        return store.getState().activeColumn;
      },

      isCellSelected: (rowId: string, field: string) => {
        return store.getState().isCellSelected(rowId, field);
      },

      hasSelection: () => {
        return store.getState().selectedCells.length > 0;
      },

      clearSelection: () => {
        store.getState().clearSelection();
      },

      selectAll: (field: string, rowIds?: string[]) => {
        const ids = rowIds ?? getVisibleRowIds();
        store.getState().selectAll(field, ids);
      },

      copySelectedValues: async () => {
        if (!getCellValue) return;

        const { selectedCells } = store.getState();
        const values = selectedCells
          .map((cell) => getCellValue(cell.rowId, cell.field))
          .filter((v) => v !== null && v !== undefined);

        const text = values.join("\n");
        await navigator.clipboard.writeText(text);
      },

      setSelectedValues: (value: unknown) => {
        if (!setCellValue) return;

        const { selectedCells } = store.getState();
        selectedCells.forEach((cell) => {
          setCellValue(cell.rowId, cell.field, value);
        });
      },

      clearSelectedValues: () => {
        if (!setCellValue) return;

        const { selectedCells } = store.getState();
        selectedCells.forEach((cell) => {
          setCellValue(cell.rowId, cell.field, null);
        });
      },
    };
  }, [store, getVisibleRowIds, getCellValue, setCellValue]);

  const handlers = useMemo(
    (): ICellSelectionHandlers => ({
      handleMouseDown,
      handleMouseEnter,
    }),
    [handleMouseDown, handleMouseEnter]
  );

  return { api, handlers, store };
};
