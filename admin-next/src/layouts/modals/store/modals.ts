import { create } from 'zustand';
import type { IModalItem, IModalPayload } from '../types';

interface IModalsState {
  modals: IModalItem[];

  /**
   * Open a new modal
   * @returns uuid of the created modal
   */
  openModal: (type: string, payload?: IModalPayload) => string;

  /**
   * Close a modal by uuid
   * Also closes all modals stacked on top of it
   */
  closeModal: (uuid: string) => void;

  /**
   * Close the topmost modal
   */
  closeTopModal: () => void;

  /**
   * Close all modals
   */
  closeAllModals: () => void;

  /**
   * Set dirty state for a modal
   */
  setDirty: (uuid: string, isDirty: boolean) => void;

  /**
   * Update modal payload
   */
  updatePayload: (uuid: string, payload: Partial<IModalPayload>) => void;

  /**
   * Get modal by uuid
   */
  getModal: (uuid: string) => IModalItem | undefined;
}

export const useModalsStore = create<IModalsState>((set, get) => ({
  modals: [],

  openModal: (type, payload = {}) => {
    const uuid = crypto.randomUUID();

    set((state) => ({
      modals: [
        ...state.modals,
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

  closeModal: (uuid) => {
    set((state) => {
      const itemIdx = state.modals.findIndex((it) => it.uuid === uuid);
      if (itemIdx === -1) return state;
      // Close this modal and all stacked on top
      return { modals: state.modals.slice(0, itemIdx) };
    });
  },

  closeTopModal: () => {
    set((state) => {
      if (state.modals.length === 0) return state;
      return { modals: state.modals.slice(0, -1) };
    });
  },

  closeAllModals: () => {
    set({ modals: [] });
  },

  setDirty: (uuid, isDirty) => {
    set((state) => ({
      modals: state.modals.map((it) =>
        it.uuid === uuid ? { ...it, isDirty } : it
      ),
    }));
  },

  updatePayload: (uuid, payload) => {
    set((state) => ({
      modals: state.modals.map((it) =>
        it.uuid === uuid
          ? { ...it, payload: { ...it.payload, ...payload } }
          : it
      ),
    }));
  },

  getModal: (uuid) => {
    return get().modals.find((it) => it.uuid === uuid);
  },
}));
