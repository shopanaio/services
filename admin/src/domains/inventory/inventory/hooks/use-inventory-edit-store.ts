import { create } from "zustand";

export type EditableField = "sku" | "onHand" | "unavailable";
export type EditableValue = string | number | null;

export interface FieldEdit {
  originalValue: EditableValue;
  currentValue: EditableValue;
}

export type ItemEdits = Partial<Record<EditableField, FieldEdit>>;

export type InventorySubmitError = {
  message: string;
  code?: string | null;
  field?: readonly string[] | null;
};

interface InventoryEditStore {
  // Current edits - source of truth for pending changes
  edits: Record<string, ItemEdits>;
  rowErrors: Record<string, InventorySubmitError[]>;
  submitErrors: InventorySubmitError[];
  status: "idle" | "saving";

  // Actions
  setFieldValue: (
    itemId: string,
    field: EditableField,
    originalValue: EditableValue,
    newValue: EditableValue
  ) => void;
  discardAll: () => void;
  discardItem: (itemId: string) => void;
  startSaving: () => void;
  finishSaving: () => void;
  onSubmitAccepted: () => void;
  setRowErrors: (itemId: string, errors: InventorySubmitError[]) => void;
  clearRowErrors: (itemId: string) => void;
  setSubmitErrors: (errors: InventorySubmitError[]) => void;
  clearSubmitErrors: () => void;

  // Selectors
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getFieldEdit: (itemId: string, field: EditableField) => FieldEdit | undefined;
  getItemEdits: (itemId: string) => ItemEdits | undefined;
  getAllEdits: () => Record<string, ItemEdits>;
}

export const useInventoryEditStore = create<InventoryEditStore>((set, get) => ({
  edits: {},
  rowErrors: {},
  submitErrors: [],
  status: "idle",

  setFieldValue: (itemId, field, originalValue, newValue) => {
    // If setting back to original, remove the edit
    if (newValue === originalValue) {
      set((state) => {
        const itemEdits = { ...state.edits[itemId] };
        delete itemEdits[field];

        // If no more edits for this item, remove the item entry
        if (Object.keys(itemEdits).length === 0) {
          const { [itemId]: _, ...rest } = state.edits;
          const { [itemId]: __, ...rowErrors } = state.rowErrors;

          return {
            edits: rest,
            rowErrors,
            submitErrors: [],
          };
        }

        return {
          edits: {
            ...state.edits,
            [itemId]: itemEdits,
          },
          rowErrors: Object.fromEntries(
            Object.entries(state.rowErrors).filter(([id]) => id !== itemId),
          ),
          submitErrors: [],
        };
      });
      return;
    }

    set((state) => {
      const { [itemId]: _, ...rowErrors } = state.rowErrors;

      return {
        edits: {
          ...state.edits,
          [itemId]: {
            ...state.edits[itemId],
            [field]: { originalValue, currentValue: newValue },
          },
        },
        rowErrors,
        submitErrors: [],
      };
    });
  },

  discardAll: () => {
    set({ edits: {}, rowErrors: {}, submitErrors: [], status: "idle" });
  },

  discardItem: (itemId) => {
    set((state) => {
      const { [itemId]: _, ...rest } = state.edits;
      const { [itemId]: __, ...rowErrors } = state.rowErrors;

      return { edits: rest, rowErrors };
    });
  },

  startSaving: () => {
    set({ status: "saving" });
  },

  finishSaving: () => {
    set({ status: "idle" });
  },

  onSubmitAccepted: () => {
    set({ edits: {}, rowErrors: {}, submitErrors: [], status: "idle" });
  },

  setRowErrors: (itemId, errors) => {
    set((state) => {
      if (errors.length === 0) {
        const { [itemId]: _, ...rowErrors } = state.rowErrors;

        return { rowErrors };
      }

      return {
        rowErrors: {
          ...state.rowErrors,
          [itemId]: errors,
        },
      };
    });
  },

  clearRowErrors: (itemId) => {
    set((state) => {
      const { [itemId]: _, ...rowErrors } = state.rowErrors;

      return { rowErrors };
    });
  },

  setSubmitErrors: (errors) => {
    set({ submitErrors: errors });
  },

  clearSubmitErrors: () => {
    set({ submitErrors: [] });
  },

  hasChanges: () => Object.keys(get().edits).length > 0,

  getChangesCount: () => {
    const edits = get().edits;
    return Object.values(edits).reduce(
      (count, fields) => count + Object.keys(fields || {}).length,
      0
    );
  },

  getFieldEdit: (itemId, field) => {
    return get().edits[itemId]?.[field];
  },

  getItemEdits: (itemId) => {
    return get().edits[itemId];
  },

  getAllEdits: () => get().edits,
}));
