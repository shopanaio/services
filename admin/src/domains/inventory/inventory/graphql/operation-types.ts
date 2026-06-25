import type {
  ApiBulkUpdateUserError,
  ApiCatalogMutation,
  ApiInventoryItemConnection,
  ApiInventoryItemInventoryItemsMetaInput,
  ApiInventoryItemOrderByInput,
  ApiInventoryItemWhereInput,
  ApiInventoryQuery,
  ApiProductBulkUpdateInput,
  BulkUpdateJobStatus,
} from "@/graphql/types";

export interface InventoryItemsQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "inventoryItems"> & {
    inventoryItems: ApiInventoryItemConnection;
  };
}

export interface InventoryItemsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiInventoryItemWhereInput | null;
  orderBy?: ApiInventoryItemOrderByInput[] | null;
  meta?: ApiInventoryItemInventoryItemsMetaInput | null;
}

export type InventoryVariantsQueryData = InventoryItemsQueryData;
export type InventoryVariantsQueryVariables = InventoryItemsQueryVariables;

export interface InventoryProductBulkUpdateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productBulkUpdate"> & {
    productBulkUpdate: {
      job: {
        id: string;
        status: BulkUpdateJobStatus;
      } | null;
      userErrors: ApiBulkUpdateUserError[];
    };
  };
}

export interface InventoryProductBulkUpdateMutationVariables {
  input: ApiProductBulkUpdateInput;
}
