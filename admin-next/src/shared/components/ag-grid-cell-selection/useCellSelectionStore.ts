import { create, StoreApi, UseBoundStore } from "zustand";
import { ICellSelection } from "./types";

interface CellSelectionState {
  // State
  selectedCells: ICellSelection[];
  isSelecting: boolean;
  selectionAnchor: ICellSelection | null;
  activeColumn: string | null;
  dragStartRowId: string | null;

  // Actions
  startSelection: (rowId: string, field: string) => void;
  extendSelection: (rowId: string, rowIds: string[]) => void;
  endSelection: () => void;
  toggleCell: (rowId: string, field: string) => void;
  selectRange: (endRowId: string, rowIds: string[]) => void;
  clearSelection: () => void;
  selectAll: (field: string, rowIds: string[]) => void;

  // Selectors
  isCellSelected: (rowId: string, field: string) => boolean;
}

/**
 * Helper to get cells in range between two row indices
 */
const getCellsInRange = (
  startRowId: string,
  endRowId: string,
  field: string,
  rowIds: string[]
): ICellSelection[] => {
  const startIdx = rowIds.indexOf(startRowId);
  const endIdx = rowIds.indexOf(endRowId);

  if (startIdx === -1 || endIdx === -1) return [];

  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);

  return rowIds.slice(minIdx, maxIdx + 1).map((rowId) => ({
    rowId,
    field,
  }));
};

/**
 * Factory to create an isolated cell selection store
 * Each grid instance should have its own store
 */
export const createCellSelectionStore = (): UseBoundStore<
  StoreApi<CellSelectionState>
> =>
  create<CellSelectionState>((set, get) => ({
    // Initial state
    selectedCells: [],
    isSelecting: false,
    selectionAnchor: null,
    activeColumn: null,
    dragStartRowId: null,

    // Start new selection (regular click)
    startSelection: (rowId, field) => {
      set({
        selectedCells: [{ rowId, field }],
        isSelecting: true,
        selectionAnchor: { rowId, field },
        activeColumn: field,
        dragStartRowId: rowId,
      });
    },

    // Extend selection during drag
    extendSelection: (rowId, rowIds) => {
      const state = get();
      if (!state.isSelecting || !state.activeColumn || !state.dragStartRowId)
        return;

      const cells = getCellsInRange(
        state.dragStartRowId,
        rowId,
        state.activeColumn,
        rowIds
      );

      set({ selectedCells: cells });
    },

    // End selection (mouse up)
    endSelection: () => {
      const state = get();
      // Keep anchor as the last selected cell for Shift+Click
      const lastCell =
        state.selectedCells.length > 0
          ? state.selectedCells[state.selectedCells.length - 1]
          : null;

      set({
        isSelecting: false,
        dragStartRowId: null,
        selectionAnchor: lastCell,
      });
    },

    // Toggle single cell (Ctrl/Cmd + Click)
    toggleCell: (rowId, field) => {
      const state = get();
      const isSelected = state.selectedCells.some(
        (c) => c.rowId === rowId && c.field === field
      );

      if (isSelected) {
        // Remove cell from selection
        set({
          selectedCells: state.selectedCells.filter(
            (c) => !(c.rowId === rowId && c.field === field)
          ),
          selectionAnchor: { rowId, field },
        });
      } else {
        // Add cell to selection (only if same column in single column mode)
        if (state.activeColumn && state.activeColumn !== field) {
          // Different column - start fresh selection
          set({
            selectedCells: [{ rowId, field }],
            activeColumn: field,
            selectionAnchor: { rowId, field },
          });
        } else {
          // Same column or no active column - add to selection
          set({
            selectedCells: [...state.selectedCells, { rowId, field }],
            activeColumn: field,
            selectionAnchor: { rowId, field },
          });
        }
      }
    },

    // Select range from anchor to target (Shift + Click)
    selectRange: (endRowId, rowIds) => {
      const state = get();
      if (!state.selectionAnchor) return;

      const { rowId: startRowId, field } = state.selectionAnchor;
      const cells = getCellsInRange(startRowId, endRowId, field, rowIds);

      set({
        selectedCells: cells,
        activeColumn: field,
      });
    },

    // Clear all selection
    clearSelection: () => {
      set({
        selectedCells: [],
        isSelecting: false,
        selectionAnchor: null,
        activeColumn: null,
        dragStartRowId: null,
      });
    },

    // Select all cells in a column
    selectAll: (field, rowIds) => {
      const cells = rowIds.map((rowId) => ({ rowId, field }));
      set({
        selectedCells: cells,
        activeColumn: field,
        selectionAnchor: cells.length > 0 ? cells[0] : null,
      });
    },

    // Check if cell is selected
    isCellSelected: (rowId, field) => {
      return get().selectedCells.some(
        (c) => c.rowId === rowId && c.field === field
      );
    },
  }));

export type CellSelectionStore = ReturnType<typeof createCellSelectionStore>;
