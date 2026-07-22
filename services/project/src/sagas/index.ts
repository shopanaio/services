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

import {
  StoreUpdateSaga,
  type StoreUpdateOperation,
  type StoreUpdateOperationResult,
  type StoreUpdateSagaInput,
  type StoreUpdateSagaOutput,
} from "./StoreUpdateSaga.js";

export { StoreCreateSaga, StoreDeleteSaga, StoreUpdateSaga };

export type {
  StoreCreateInput,
  StoreCreateOutput,
  StoreDeleteInput,
  StoreDeleteOutput,
  StoreUpdateOperation,
  StoreUpdateOperationResult,
  StoreUpdateSagaInput,
  StoreUpdateSagaOutput,
};

export const sagas = [StoreCreateSaga, StoreUpdateSaga, StoreDeleteSaga];
