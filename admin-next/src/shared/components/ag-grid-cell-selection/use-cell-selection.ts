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
} from "./use-cell-selection-store";
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
    enableKeyboardShortcuts = true,
    onSelectionChange,
    getCellValue,
    setCellValue,
    incrementCellValue,
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
        // Shift + Click - select range from anchor to clicked cell
        if (singleColumnOnly && state.activeColumn && state.activeColumn !== field) {
          // Different column in single column mode - start fresh
          state.startSelection(rowId, field);
        } else {
          // Select range using anchor's field (for single column mode)
          const targetField = singleColumnOnly ? state.selectionAnchor.field : field;
          state.selectRange(rowId, targetField, getVisibleRowIds());
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

      get selectionCount() {
        return store.getState().selectedCells.length;
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

      getSelectedValues: () => {
        if (!getCellValue) return [];
        const { selectedCells } = store.getState();
        return selectedCells.map((cell) => getCellValue(cell.rowId, cell.field));
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

      pasteToSelectedCells: async () => {
        if (!setCellValue) return;

        try {
          const text = await navigator.clipboard.readText();
          const values = text.split("\n").filter((v) => v.trim() !== "");
          const { selectedCells } = store.getState();

          // Apply values cyclically if less values than cells
          selectedCells.forEach((cell, index) => {
            const value = values[index % values.length];
            if (value !== undefined) {
              // Try to parse as number if it looks like a number
              const numValue = parseFloat(value);
              setCellValue(
                cell.rowId,
                cell.field,
                isNaN(numValue) ? value : numValue
              );
            }
          });
        } catch {
          // Clipboard access denied or other error
          console.warn("Could not paste from clipboard");
        }
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

      incrementSelectedValues: (delta: number) => {
        if (!incrementCellValue) return;

        const { selectedCells } = store.getState();
        selectedCells.forEach((cell) => {
          incrementCellValue(cell.rowId, cell.field, delta);
        });
      },
    };
  }, [store, getVisibleRowIds, getCellValue, setCellValue, incrementCellValue]);

  const handlers = useMemo(
    (): ICellSelectionHandlers => ({
      handleMouseDown,
      handleMouseEnter,
    }),
    [handleMouseDown, handleMouseEnter]
  );

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const state = store.getState();
      if (!state.hasSelection()) return;

      // Check if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Escape - clear selection
      if (event.key === "Escape") {
        event.preventDefault();
        state.clearSelection();
        return;
      }

      // Delete/Backspace - clear values
      if (event.key === "Delete" || event.key === "Backspace") {
        if (setCellValue) {
          event.preventDefault();
          api.clearSelectedValues();
        }
        return;
      }

      // Ctrl/Cmd + C - copy
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        if (getCellValue) {
          event.preventDefault();
          api.copySelectedValues();
        }
        return;
      }

      // Ctrl/Cmd + V - paste
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        if (setCellValue) {
          event.preventDefault();
          api.pasteToSelectedCells();
        }
        return;
      }

      // Ctrl/Cmd + A - select all in column
      if ((event.ctrlKey || event.metaKey) && event.key === "a") {
        const { activeColumn } = state;
        if (activeColumn) {
          event.preventDefault();
          state.selectAll(activeColumn, getVisibleRowIds());
        }
        return;
      }

      // Arrow Up/Down with Shift - increment/decrement numeric values
      if (event.shiftKey && incrementCellValue) {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          api.incrementSelectedValues(1);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          api.incrementSelectedValues(-1);
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enableKeyboardShortcuts,
    store,
    api,
    getVisibleRowIds,
    getCellValue,
    setCellValue,
    incrementCellValue,
  ]);

  return { api, handlers, store };
};
