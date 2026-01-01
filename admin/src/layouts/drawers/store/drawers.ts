import { create } from 'zustand';
import type { IDrawerItem, IDrawerPayload, DrawerPayloads } from '../types';

interface IDrawersState {
  drawers: IDrawerItem[];

  /**
   * Open a new drawer
   * @returns uuid of the created drawer
   */
  openDrawer: <T extends keyof DrawerPayloads>(
    type: T,
    payload?: DrawerPayloads[T]
  ) => string;

  /**
   * Close a drawer by uuid
   * Also closes all drawers stacked on top of it
   */
  closeDrawer: (uuid: string) => void;

  /**
   * Close the topmost drawer
   */
  closeTopDrawer: () => void;

  /**
   * Close all drawers
   */
  closeAllDrawers: () => void;

  /**
   * Set dirty state for a drawer
   */
  setDirty: (uuid: string, isDirty: boolean) => void;

  /**
   * Update drawer payload
   */
  updatePayload: (uuid: string, payload: Partial<IDrawerPayload>) => void;

  /**
   * Get drawer by uuid
   */
  getDrawer: (uuid: string) => IDrawerItem | undefined;

  // ============================================================================
  // Legacy API - for backward compatibility
  // ============================================================================

  /** @deprecated Use openDrawer instead */
  addDrawer: (payload: { type: string; entityId?: string | number }) => void;

  /** @deprecated Use closeDrawer instead */
  removeDrawer: (uuid: string) => void;

  /** @deprecated Use updatePayload instead */
  updateDrawer: (payload: Partial<IDrawerItem> & { uuid: string }) => void;
}

export const useDrawersStore = create<IDrawersState>((set, get) => ({
  drawers: [],

  openDrawer: (type, payload = {} as DrawerPayloads[typeof type]) => {
    const uuid = crypto.randomUUID();

    set((state) => ({
      drawers: [
        ...state.drawers,
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

  closeDrawer: (uuid) => {
    set((state) => {
      const itemIdx = state.drawers.findIndex((it) => it.uuid === uuid);
      if (itemIdx === -1) return state;
      // Close this drawer and all stacked on top
      return { drawers: state.drawers.slice(0, itemIdx) };
    });
  },

  closeTopDrawer: () => {
    set((state) => {
      if (state.drawers.length === 0) return state;
      return { drawers: state.drawers.slice(0, -1) };
    });
  },

  closeAllDrawers: () => {
    set({ drawers: [] });
  },

  setDirty: (uuid, isDirty) => {
    set((state) => ({
      drawers: state.drawers.map((it) =>
        it.uuid === uuid ? { ...it, isDirty } : it
      ),
    }));
  },

  updatePayload: (uuid, payload) => {
    set((state) => ({
      drawers: state.drawers.map((it) =>
        it.uuid === uuid
          ? { ...it, payload: { ...it.payload, ...payload } }
          : it
      ),
    }));
  },

  getDrawer: (uuid) => {
    return get().drawers.find((it) => it.uuid === uuid);
  },

  // Legacy API
  addDrawer: (payload) => {
    const uuid = crypto.randomUUID();
    set((state) => ({
      drawers: [
        ...state.drawers,
        {
          uuid,
          type: payload.type,
          payload: { entityId: payload.entityId },
          isDirty: false,
        },
      ],
    }));
  },

  removeDrawer: (uuid) => {
    get().closeDrawer(uuid);
  },

  updateDrawer: (payload) => {
    set((state) => ({
      drawers: state.drawers.map((it) =>
        it.uuid === payload.uuid ? { ...it, ...payload } : it
      ),
    }));
  },
}));
