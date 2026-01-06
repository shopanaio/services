import { create } from "zustand";

export type EditableField = "onHand" | "unavailable";

interface FieldEdit {
  originalValue: number;
  currentValue: number;
}

type ItemEdits = Partial<Record<EditableField, FieldEdit>>;

interface InventoryEditStore {
  // Current edits - source of truth for pending changes
  edits: Record<string, ItemEdits>;
  status: "idle" | "saving";

  // Actions
  setFieldValue: (
    itemId: string,
    field: EditableField,
    originalValue: number,
    newValue: number
  ) => void;
  discardAll: () => void;
  discardItem: (itemId: string) => void;
  startSaving: () => void;
  onSaveSuccess: () => void;

  // Selectors
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getFieldEdit: (itemId: string, field: EditableField) => FieldEdit | undefined;
  getItemEdits: (itemId: string) => ItemEdits | undefined;
  getAllEdits: () => Record<string, ItemEdits>;
}

export const useInventoryEditStore = create<InventoryEditStore>((set, get) => ({
  edits: {},
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
          return { edits: rest };
        }

        return {
          edits: {
            ...state.edits,
            [itemId]: itemEdits,
          },
        };
      });
      return;
    }

    set((state) => ({
      edits: {
        ...state.edits,
        [itemId]: {
          ...state.edits[itemId],
          [field]: { originalValue, currentValue: newValue },
        },
      },
    }));
  },

  discardAll: () => {
    set({ edits: {}, status: "idle" });
  },

  discardItem: (itemId) => {
    set((state) => {
      const { [itemId]: _, ...rest } = state.edits;
      return { edits: rest };
    });
  },

  startSaving: () => {
    set({ status: "saving" });
  },

  onSaveSuccess: () => {
    set({ edits: {}, status: "idle" });
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
