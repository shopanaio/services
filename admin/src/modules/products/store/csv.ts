import { makeMethod, makeSelector, makeStore } from '@reframework/qx';
import { IProduct } from '@src/entity/Product/Product';

export enum CsvUploadStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
}

export type ICsvProduct = Omit<IProduct, 'status'> & {
  status: CsvUploadStatus;
};

interface ICsvUploadState {
  products: ICsvProduct[];
  status: CsvUploadStatus;
}

const store = makeStore<ICsvUploadState>('csvUploadingStore', {
  products: [],
  status: CsvUploadStatus.IDLE,
});

export const $csv = {
  store,
  products: makeSelector(store, (state) => state.products),
  setProducts: makeMethod(store, (state, payload: ICsvProduct[]) => {
    return { ...state, products: payload };
  }),
  status: makeSelector(store, (state) => state.status),
  setStatus: makeMethod(store, (state, payload: CsvUploadStatus) => {
    return { ...state, status: payload };
  }),
  isUploading: makeSelector(
    store,
    (state) => state.status === CsvUploadStatus.PENDING,
  ),
  setItemsStatus: makeMethod(
    store,
    (state, payload: { id: ID; status: CsvUploadStatus }[]) => {
      const products = state.products.map((product) => {
        const item = payload.find((item) => item.id === product.id);
        if (item) {
          return { ...product, status: item.status };
        }

        return product;
      });

      return { ...state, products };
    },
  ),
};
