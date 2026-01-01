import { makeMethod, makeSelector, makeStore } from '@reframework/qx';
import { IEntityDrawerItem } from '@src/layouts/drawers/types';

interface IDrawersState {
  drawers: IEntityDrawerItem[];
}

const store = makeStore<IDrawersState>('drawers', {
  drawers: [],
});

const drawers = (state: IDrawersState) => state.drawers;

export const addDrawer = (
  state: IDrawersState,
  payload: Omit<IEntityDrawerItem, 'uuid'>,
) => {
  return {
    ...state,
    drawers: [
      ...state.drawers,
      {
        ...payload,
        uuid: crypto.randomUUID(),
      },
    ],
  };
};

export const removeDrawer = (state: IDrawersState, uuid: string) => {
  const itemIdx = state.drawers.findIndex((it) => {
    return it.uuid === uuid;
  });

  if (itemIdx === -1) {
    return state;
  }

  return {
    ...state,
    /**
     * Array is sliced since all the next drawers should be removed as well
     */
    drawers: state.drawers.slice(0, itemIdx),
  };
};

export const setDirty = (
  state: IDrawersState,
  payload: { uuid: string; isDirty: boolean },
) => {
  return {
    ...state,
    drawers: state.drawers.map((it) => {
      if (payload.uuid === it.uuid) {
        return { ...it, isDirty: payload.isDirty };
      }

      return it;
    }),
  };
};

export const onUpdate = (
  state: IDrawersState,
  payload: Partial<IEntityDrawerItem>,
) => {
  return {
    ...state,
    drawers: state.drawers.map((it) => {
      if (payload.uuid === it.uuid) {
        return { ...it, ...payload };
      }

      return it;
    }),
  };
};

export const $drawers = {
  store,
  drawers: makeSelector(store, drawers),
  addDrawer: makeMethod(store, addDrawer),
  removeDrawer: makeMethod(store, removeDrawer),
  setDirty: makeMethod(store, setDirty),
  updateDrawer: makeMethod(store, onUpdate),
};
