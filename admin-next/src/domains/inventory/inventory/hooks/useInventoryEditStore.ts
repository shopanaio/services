import { create } from "zustand";

export type EditableField = "onHand" | "unavailable";

interface FieldChange {
  originalValue: number;
}

interface InventoryEditStore {
  // Track original values before editing
  originalValues: Record<string, Partial<Record<EditableField, FieldChange>>>;
  status: "idle" | "saving";

  // Actions
  trackChange: (itemId: string, field: EditableField, originalValue: number) => void;
  discardAll: () => void;
  startSaving: () => void;
  onSaveSuccess: () => void;

  // Computed
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getOriginalValue: (itemId: string, field: EditableField) => number | null;
}

export const useInventoryEditStore = create<InventoryEditStore>((set, get) => ({
  originalValues: {},
  status: "idle",

  trackChange: (itemId, field, originalValue) => {
    const current = get().originalValues[itemId]?.[field];
    // Only track if not already tracking this field
    if (!current) {
      set((state) => ({
        originalValues: {
          ...state.originalValues,
          [itemId]: {
            ...state.originalValues[itemId],
            [field]: { originalValue },
          },
        },
      }));
    }
  },

  discardAll: () => {
    set({ originalValues: {}, status: "idle" });
  },

  startSaving: () => {
    set({ status: "saving" });
  },

  onSaveSuccess: () => {
    set({ originalValues: {}, status: "idle" });
  },

  hasChanges: () => Object.keys(get().originalValues).length > 0,

  getChangesCount: () => {
    const changes = get().originalValues;
    return Object.values(changes).reduce(
      (count, fields) => count + Object.keys(fields || {}).length,
      0
    );
  },

  getOriginalValue: (itemId, field) => {
    return get().originalValues[itemId]?.[field]?.originalValue ?? null;
  },
}));
