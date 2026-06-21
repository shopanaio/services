import type {
  ApiBulkUpdateUserError,
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiInventoryQuery,
  ApiProductBulkUpdateInput,
  ApiVariantConnection,
  ApiVariantOrderByInput,
  ApiVariantWhereInput,
  ApiWarehouseConnection,
  BulkUpdateJobStatus,
} from "@/graphql/types";

export interface InventoryVariantsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "variants"> & {
    variants: ApiVariantConnection;
  };
}

export interface InventoryVariantsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiVariantWhereInput | null;
  orderBy: ApiVariantOrderByInput[];
}

export interface InventoryDefaultWarehouseQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "warehouses"> & {
    warehouses: ApiWarehouseConnection;
  };
}

export type InventoryDefaultWarehouseQueryVariables = Record<string, never>;

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
