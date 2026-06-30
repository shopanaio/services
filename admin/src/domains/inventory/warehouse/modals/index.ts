import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiWarehouse } from "@/graphql/types";
import type {
  WarehouseDetailsQueryVariables,
  WarehousesQueryVariables,
} from "../graphql";

export const WAREHOUSE_MODAL_TYPE = "warehouse";
export const WAREHOUSE_CREATE_MODAL_TYPE = "warehouse-create";
export const WAREHOUSE_EDIT_IDENTITY_MODAL_TYPE = "warehouse-edit-identity";
export const WAREHOUSE_EDIT_DEFAULT_MODAL_TYPE = "warehouse-edit-default";
export const WAREHOUSE_DELETE_MODAL_TYPE = "warehouse-delete";

export interface IWarehouseModalPayload extends IModalStackPayload {
  entityId: string;
  listQueryVariables?: WarehousesQueryVariables;
}

export interface IWarehouseCreateModalPayload extends IModalStackPayload {
  listQueryVariables?: WarehousesQueryVariables;
}

export interface IWarehouseEditIdentityModalPayload
  extends IModalStackPayload {
  warehouse: ApiWarehouse;
  listQueryVariables?: WarehousesQueryVariables;
  detailsQueryVariables?: WarehouseDetailsQueryVariables;
  onUpdated?: (warehouse: ApiWarehouse) => void | Promise<void>;
}

export interface IWarehouseEditDefaultModalPayload extends IModalStackPayload {
  warehouse: ApiWarehouse;
  listQueryVariables?: WarehousesQueryVariables;
  detailsQueryVariables?: WarehouseDetailsQueryVariables;
  onUpdated?: (warehouse: ApiWarehouse) => void | Promise<void>;
}

export interface IWarehouseDeleteModalPayload extends IModalStackPayload {
  warehouse: ApiWarehouse;
  listQueryVariables?: WarehousesQueryVariables;
  onDeleted?: (deletedWarehouseId: string) => void | Promise<void>;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [WAREHOUSE_MODAL_TYPE]: IWarehouseModalPayload;
    [WAREHOUSE_CREATE_MODAL_TYPE]: IWarehouseCreateModalPayload;
    [WAREHOUSE_EDIT_IDENTITY_MODAL_TYPE]: IWarehouseEditIdentityModalPayload;
    [WAREHOUSE_EDIT_DEFAULT_MODAL_TYPE]: IWarehouseEditDefaultModalPayload;
    [WAREHOUSE_DELETE_MODAL_TYPE]: IWarehouseDeleteModalPayload;
  }
}

export const useWarehouseModal = createModalStackHook(WAREHOUSE_MODAL_TYPE);
export const useWarehouseCreateModal = createModalStackHook(
  WAREHOUSE_CREATE_MODAL_TYPE,
);
export const useWarehouseEditIdentityModal = createModalStackHook(
  WAREHOUSE_EDIT_IDENTITY_MODAL_TYPE,
);
export const useWarehouseEditDefaultModal = createModalStackHook(
  WAREHOUSE_EDIT_DEFAULT_MODAL_TYPE,
);
export const useWarehouseDeleteModal = createModalStackHook(
  WAREHOUSE_DELETE_MODAL_TYPE,
);
