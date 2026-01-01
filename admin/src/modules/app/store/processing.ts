import { makeMethod, makeSelector, makeStore } from '@reframework/qx';

interface IAppProcessingState {
  isProcessing: boolean;
}

const store = makeStore<IAppProcessingState>('drawers', {
  isProcessing: false,
});

const isProcessing = (state: IAppProcessingState) => state.isProcessing;

export const setProcessing = (state: IAppProcessingState, payload: boolean) => {
  return {
    ...state,
    isProcessing: payload,
  };
};

export const $appProcessing = {
  store,
  isProcessing: makeSelector(store, isProcessing),
  setProcessing: makeMethod(store, setProcessing),
};
