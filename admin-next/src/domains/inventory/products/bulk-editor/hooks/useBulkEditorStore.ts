import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  IColumnVisibility,
  IFieldEdit,
  IRowEdits,
  DEFAULT_COLUMN_VISIBILITY,
} from "../types";

interface BulkEditorStore {
  // State
  selectedProductIds: string[];
  edits: Record<string, IRowEdits>;
  columnVisibility: IColumnVisibility;
  status: "idle" | "saving";
  isOpen: boolean;

  // Actions - Selection
  setSelectedProducts: (ids: string[]) => void;
  clearSelection: () => void;

  // Actions - Editor
  openEditor: () => void;
  closeEditor: () => void;

  // Actions - Editing
  setFieldValue: (
    rowId: string,
    field: string,
    originalValue: unknown,
    newValue: unknown
  ) => void;
  discardAll: () => void;
  discardRow: (rowId: string) => void;

  // Actions - Saving
  startSaving: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;

  // Actions - Column Visibility
  setColumnVisibility: (field: string, visible: boolean) => void;
  toggleColumn: (field: string) => void;
  resetColumnsToDefault: () => void;

  // Selectors
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getRowEdits: (rowId: string) => IRowEdits | undefined;
  getFieldEdit: (rowId: string, field: string) => IFieldEdit | undefined;
  isColumnVisible: (field: string) => boolean;
}

export const useBulkEditorStore = create<BulkEditorStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        selectedProductIds: [],
        edits: {},
        columnVisibility: DEFAULT_COLUMN_VISIBILITY,
        status: "idle",
        isOpen: false,

        // Selection actions
        setSelectedProducts: (ids) => set({ selectedProductIds: ids }),
        clearSelection: () => set({ selectedProductIds: [] }),

        // Editor actions
        openEditor: () => set({ isOpen: true }),
        closeEditor: () => set({ isOpen: false, edits: {} }),

        // Edit actions
        setFieldValue: (rowId, field, originalValue, newValue) => {
          set((state) => {
            const rowEdits = state.edits[rowId] || {};

            // If reverted to original, remove the edit
            if (originalValue === newValue) {
              const { [field]: _, ...restFields } = rowEdits;
              if (Object.keys(restFields).length === 0) {
                const { [rowId]: __, ...restEdits } = state.edits;
                return { edits: restEdits };
              }
              return { edits: { ...state.edits, [rowId]: restFields } };
            }

            return {
              edits: {
                ...state.edits,
                [rowId]: {
                  ...rowEdits,
                  [field]: { originalValue, currentValue: newValue },
                },
              },
            };
          });
        },

        discardAll: () => set({ edits: {} }),
        discardRow: (rowId) =>
          set((state) => {
            const { [rowId]: _, ...rest } = state.edits;
            return { edits: rest };
          }),

        // Save actions
        startSaving: () => set({ status: "saving" }),
        onSaveSuccess: () => set({ status: "idle", edits: {} }),
        onSaveError: () => set({ status: "idle" }),

        // Column visibility actions
        setColumnVisibility: (field, visible) =>
          set((state) => ({
            columnVisibility: { ...state.columnVisibility, [field]: visible },
          })),
        toggleColumn: (field) =>
          set((state) => ({
            columnVisibility: {
              ...state.columnVisibility,
              [field]: !state.columnVisibility[field],
            },
          })),
        resetColumnsToDefault: () =>
          set({ columnVisibility: DEFAULT_COLUMN_VISIBILITY }),

        // Selectors
        hasChanges: () => Object.keys(get().edits).length > 0,
        getChangesCount: () => {
          return Object.values(get().edits).reduce(
            (count, rowEdits) => count + Object.keys(rowEdits).length,
            0
          );
        },
        getRowEdits: (rowId) => get().edits[rowId],
        getFieldEdit: (rowId, field) => get().edits[rowId]?.[field],
        isColumnVisible: (field) => get().columnVisibility[field] ?? true,
      }),
      {
        name: "bulk-editor-store",
        partialize: (state) => ({
          columnVisibility: state.columnVisibility,
        }),
      }
    ),
    { name: "bulk-editor" }
  )
);
