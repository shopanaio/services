import type {
  ApiGenericUserError,
  ApiInventoryMutation,
  ApiInventoryQuery,
  ApiWarehouse,
  ApiWarehouseConnection,
  ApiWarehouseCreateInput,
  ApiWarehouseDeleteInput,
  ApiWarehouseOrderByInput,
  ApiWarehouseUpdateInput,
  ApiWarehouseWhereInput,
} from "@/graphql/types";

export interface WarehousesQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "warehouses"> & {
    warehouses: ApiWarehouseConnection;
  };
}

export interface WarehousesQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiWarehouseWhereInput | null;
  orderBy?: ApiWarehouseOrderByInput[] | null;
}

export interface WarehouseDetailsQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "warehouse"> & {
    warehouse: ApiWarehouse | null;
  };
}

export interface WarehouseDetailsQueryVariables {
  id: string;
}

export interface WarehouseCreateMutationData {
  inventoryMutation: Pick<ApiInventoryMutation, "warehouseCreate"> & {
    warehouseCreate: {
      warehouse: ApiWarehouse | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface WarehouseCreateMutationVariables {
  input: ApiWarehouseCreateInput;
}

export interface WarehouseUpdateMutationData {
  inventoryMutation: Pick<ApiInventoryMutation, "warehouseUpdate"> & {
    warehouseUpdate: {
      warehouse: ApiWarehouse | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface WarehouseUpdateMutationVariables {
  input: ApiWarehouseUpdateInput;
}

export interface WarehouseDeleteMutationData {
  inventoryMutation: Pick<ApiInventoryMutation, "warehouseDelete"> & {
    warehouseDelete: {
      deletedWarehouseId: string | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface WarehouseDeleteMutationVariables {
  input: ApiWarehouseDeleteInput;
}
