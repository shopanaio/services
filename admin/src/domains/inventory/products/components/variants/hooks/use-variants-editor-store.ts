import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  IFieldEdit,
  IRowEdits,
} from "@/shared/components/editor-grid/types";

// ============================================================================
// Types
// ============================================================================

export interface IColumnVisibility {
  [field: string]: boolean;
}

// Default column visibility for variants editor
export const DEFAULT_VARIANTS_COLUMN_VISIBILITY: IColumnVisibility = {
  // Media column
  media: true,
  // Options columns are always visible by default (handled dynamically)
  // Variant columns
  sku: true,
  price: true,
  compareAtPrice: false,
  costPrice: false,
  // Inventory columns (same model as inventory table)
  onHand: true,
  unavailable: true,
  reserved: true,
  available: true,
  weight: false,
  length: false,
  width: false,
  height: false,
};

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && "id" in item) {
        return (item as { id: unknown }).id;
      }

      return item;
    });
  }

  return value;
}

function areFieldValuesEqual(left: unknown, right: unknown): boolean {
  const comparableLeft = normalizeComparableValue(left);
  const comparableRight = normalizeComparableValue(right);

  if (Array.isArray(comparableLeft) && Array.isArray(comparableRight)) {
    return (
      comparableLeft.length === comparableRight.length &&
      comparableLeft.every((item, index) => item === comparableRight[index])
    );
  }

  return comparableLeft === comparableRight;
}

// ============================================================================
// Store Interface
// ============================================================================

interface VariantsEditorStore {
  // State
  edits: Record<string, IRowEdits>;
  columnVisibility: IColumnVisibility;
  optionColumnVisibility: Record<string, boolean>;
  status: "idle" | "saving";

  // Actions - Editing
  setFieldValue: (
    rowId: string,
    field: string,
    originalValue: unknown,
    newValue: unknown
  ) => void;
  discardAll: () => void;
  discardRow: (rowId: string) => void;
  resetEdits: () => void;

  // Actions - Saving
  startSaving: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;

  // Actions - Column Visibility
  setColumnVisibility: (field: string, visible: boolean) => void;
  toggleColumn: (field: string) => void;
  setOptionColumnVisibility: (optionName: string, visible: boolean) => void;
  toggleOptionColumn: (optionName: string) => void;
  resetColumnsToDefault: () => void;

  // Selectors
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getRowEdits: (rowId: string) => IRowEdits | undefined;
  getFieldEdit: (rowId: string, field: string) => IFieldEdit | undefined;
  isColumnVisible: (field: string) => boolean;
  isOptionColumnVisible: (optionName: string) => boolean;
}

// ============================================================================
// Store
// ============================================================================

export const useVariantsEditorStore = create<VariantsEditorStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        edits: {},
        columnVisibility: DEFAULT_VARIANTS_COLUMN_VISIBILITY,
        optionColumnVisibility: {},
        status: "idle",

        // Edit actions
        setFieldValue: (rowId, field, originalValue, newValue) => {
          set((state) => {
            const rowEdits = state.edits[rowId] || {};

            // If reverted to original, remove the edit
            if (areFieldValuesEqual(originalValue, newValue)) {
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
        resetEdits: () => set({ edits: {} }),

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
        setOptionColumnVisibility: (optionName, visible) =>
          set((state) => ({
            optionColumnVisibility: {
              ...state.optionColumnVisibility,
              [optionName]: visible,
            },
          })),
        toggleOptionColumn: (optionName) =>
          set((state) => ({
            optionColumnVisibility: {
              ...state.optionColumnVisibility,
              [optionName]: !(state.optionColumnVisibility[optionName] ?? true),
            },
          })),
        resetColumnsToDefault: () =>
          set({
            columnVisibility: DEFAULT_VARIANTS_COLUMN_VISIBILITY,
            optionColumnVisibility: {},
          }),

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
        isOptionColumnVisible: (optionName) =>
          get().optionColumnVisibility[optionName] ?? true,
      }),
      {
        name: "variants-editor-store",
        partialize: (state) => ({
          columnVisibility: state.columnVisibility,
          optionColumnVisibility: state.optionColumnVisibility,
        }),
      }
    ),
    { name: "variants-editor" }
  )
);
