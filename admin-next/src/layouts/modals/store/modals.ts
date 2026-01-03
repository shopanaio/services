import { create } from 'zustand';
import type { IStackItem, IStackPayload } from '../types';

interface IStackState {
  items: IStackItem[];

  /**
   * Push a new item onto the stack
   * @returns uuid of the created item
   */
  push: (type: string, payload?: IStackPayload) => string;

  /**
   * Pop an item from the stack by uuid
   * Also pops all items stacked on top of it
   */
  pop: (uuid?: string) => void;

  /**
   * Clear all items from the stack
   */
  clear: () => void;

  /**
   * Set dirty state for an item
   */
  setDirty: (uuid: string, isDirty: boolean) => void;

  /**
   * Update item payload
   */
  updatePayload: (uuid: string, payload: Partial<IStackPayload>) => void;

  /**
   * Get item by uuid
   */
  getItem: (uuid: string) => IStackItem | undefined;

  /**
   * Peek at the top item without removing it
   */
  peek: () => IStackItem | undefined;

  /**
   * Get stack size
   */
  size: () => number;
}

export const useStackStore = create<IStackState>((set, get) => ({
  items: [],

  push: (type, payload = {}) => {
    const uuid = crypto.randomUUID();

    set((state) => ({
      items: [
        ...state.items,
        {
          uuid,
          type: type as string,
          payload,
          isDirty: false,
        },
      ],
    }));

    return uuid;
  },

  pop: (uuid) => {
    set((state) => {
      // If no uuid provided, pop the top item
      if (!uuid) {
        if (state.items.length === 0) return state;
        return { items: state.items.slice(0, -1) };
      }

      // Pop by uuid - also removes all items above it
      const itemIdx = state.items.findIndex((it) => it.uuid === uuid);
      if (itemIdx === -1) return state;
      return { items: state.items.slice(0, itemIdx) };
    });
  },

  clear: () => {
    set({ items: [] });
  },

  setDirty: (uuid, isDirty) => {
    set((state) => ({
      items: state.items.map((it) =>
        it.uuid === uuid ? { ...it, isDirty } : it
      ),
    }));
  },

  updatePayload: (uuid, payload) => {
    set((state) => ({
      items: state.items.map((it) =>
        it.uuid === uuid
          ? { ...it, payload: { ...it.payload, ...payload } }
          : it
      ),
    }));
  },

  getItem: (uuid) => {
    return get().items.find((it) => it.uuid === uuid);
  },

  peek: () => {
    const items = get().items;
    return items[items.length - 1];
  },

  size: () => {
    return get().items.length;
  },
}));

// ============================================================================
// Legacy alias (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use useStackStore instead */
export const useModalsStore = useStackStore;
