import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import {
  INVENTORY_PRODUCT_BULK_UPDATE_USER_ERROR_FRAGMENT,
  INVENTORY_VARIANT_STOCK_FRAGMENT,
} from "./fragments";

export const INVENTORY_PRODUCT_BULK_UPDATE_MUTATION = gql`
  mutation InventoryProductBulkUpdate($input: ProductBulkUpdateInput!) {
    catalogMutation {
      productBulkUpdate(input: $input) {
        job {
          id
          status
        }
        userErrors {
          ...InventoryProductBulkUpdateUserErrorFields
        }
      }
    }
  }
  ${INVENTORY_PRODUCT_BULK_UPDATE_USER_ERROR_FRAGMENT}
`;

export const WAREHOUSE_STOCK_CREATE_MUTATION = gql`
  mutation WarehouseStockCreate($input: WarehouseStockCreateInput!) {
    inventoryMutation {
      warehouseStockCreate(input: $input) {
        warehouseStocks {
          ...InventoryVariantStockFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${INVENTORY_VARIANT_STOCK_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const WAREHOUSE_STOCK_DELETE_MUTATION = gql`
  mutation WarehouseStockDelete($input: WarehouseStockDeleteInput!) {
    inventoryMutation {
      warehouseStockDelete(input: $input) {
        deletedWarehouseStockIds
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;
