import { create } from 'zustand';
import type { IModalStackItem, IModalStackPayload } from '../types';

interface IModalStackState {
  items: IModalStackItem[];

  /**
   * Push a new item onto the modal stack
   * @returns uuid of the created item
   */
  push: (
    type: string,
    payload?: IModalStackPayload,
    options?: {
      owner?: string;
      onRemoved?: (reason: "closed" | "owner-disposed") => void;
    },
  ) => string;

  /**
   * Pop an item from the modal stack by uuid
   * Also pops all items stacked on top of it
   */
  pop: (uuid?: string) => void;

  /**
   * Clear all items from the modal stack
   */
  clear: () => void;

  /**
   * Close every modal owned by one dynamic Admin App.
   */
  closeByOwner: (owner: string) => void;

  /**
   * Set dirty state for an item
   */
  setDirty: (uuid: string, isDirty: boolean) => void;

  /**
   * Update item payload
   */
  updatePayload: (uuid: string, payload: Partial<IModalStackPayload>) => void;

  /**
   * Get item by uuid
   */
  getItem: (uuid: string) => IModalStackItem | undefined;

  /**
   * Peek at the top item without removing it
   */
  peek: () => IModalStackItem | undefined;

  /**
   * Get stack size
   */
  size: () => number;
}

export const useModalStackStore = create<IModalStackState>((set, get) => ({
  items: [],

  push: (type, payload = {}, options) => {
    const uuid = crypto.randomUUID();

    set((state) => ({
      items: [
        ...state.items,
        {
          uuid,
          type: type as string,
          payload,
          owner: options?.owner,
          onRemoved: options?.onRemoved,
          isDirty: false,
        },
      ],
    }));

    return uuid;
  },

  pop: (uuid) => {
    const items = get().items;
    const itemIdx = uuid
      ? items.findIndex((item) => item.uuid === uuid)
      : items.length - 1;
    const removed = itemIdx < 0 ? [] : items.slice(itemIdx);

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

    removed.forEach((item) => item.onRemoved?.("closed"));
  },

  clear: () => {
    const removed = get().items;
    set({ items: [] });
    removed.forEach((item) => item.onRemoved?.("closed"));
  },

  closeByOwner: (owner) => {
    const removed = get().items.filter((item) => item.owner === owner);
    set((state) => ({
      items: state.items.filter((item) => item.owner !== owner),
    }));
    removed.forEach((item) => item.onRemoved?.("owner-disposed"));
  },

  setDirty: (uuid, isDirty) => {
    set((state) => {
      const item = state.items.find((it) => it.uuid === uuid);

      if (!item || item.isDirty === isDirty) {
        return state;
      }

      return {
        items: state.items.map((it) =>
          it.uuid === uuid ? { ...it, isDirty } : it
        ),
      };
    });
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
