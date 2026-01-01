import { makeMethod, makeSelector, makeStore } from '@reframework/qx';
import { IEntityModalItem } from '@src/layouts/modals/types';

interface IModalsState {
  modals: IEntityModalItem[];
}

const store = makeStore<IModalsState>('modals', {
  modals: [],
});

const modals = (state: IModalsState) => state.modals;

export const addModal = (
  state: IModalsState,
  payload: Omit<IEntityModalItem, 'uuid'>,
) => {
  return {
    ...state,
    modals: [
      ...state.modals,
      {
        ...payload,
        uuid: crypto.randomUUID(),
      },
    ],
  };
};

export const removeModal = (state: IModalsState, uuid: string) => {
  const itemIdx = state.modals.findIndex((it) => {
    return it.uuid === uuid;
  });

  if (itemIdx === -1) {
    return state;
  }

  return {
    ...state,
    /**
     * Array is sliced since all the next modals should be removed as well
     */
    modals: state.modals.slice(0, itemIdx),
  };
};

export const setDirty = (
  state: IModalsState,
  payload: { uuid: string; isDirty: boolean },
) => {
  return {
    ...state,
    modals: state.modals.map((it) => {
      if (payload.uuid === it.uuid) {
        return { ...it, isDirty: payload.isDirty };
      }

      return it;
    }),
  };
};

export const onUpdate = (
  state: IModalsState,
  payload: Partial<IEntityModalItem>,
) => {
  return {
    ...state,
    modals: state.modals.map((it) => {
      if (payload.uuid === it.uuid) {
        return { ...it, ...payload };
      }

      return it;
    }),
  };
};

export const $modals = {
  store,
  modals: makeSelector(store, modals),
  addModal: makeMethod(store, addModal),
  removeModal: makeMethod(store, removeModal),
  setDirty: makeMethod(store, setDirty),
  updateModal: makeMethod(store, onUpdate),
};
