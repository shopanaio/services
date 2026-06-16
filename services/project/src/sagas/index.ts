import {
  StoreCreateSaga,
  type StoreCreateInput,
  type StoreCreateOutput,
} from "./StoreCreateSaga.js";

import {
  StoreDeleteSaga,
  type StoreDeleteInput,
  type StoreDeleteOutput,
} from "./StoreDeleteSaga.js";

export { StoreCreateSaga, StoreDeleteSaga };

export type {
  StoreCreateInput,
  StoreCreateOutput,
  StoreDeleteInput,
  StoreDeleteOutput,
};

export const sagas = [StoreCreateSaga, StoreDeleteSaga];
