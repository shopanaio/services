import { gql } from "@apollo/client";
import {
  WAREHOUSE_LIST_FRAGMENT,
  WAREHOUSE_USER_ERROR_FRAGMENT,
} from "./fragments";

export const WAREHOUSE_CREATE_MUTATION = gql`
  mutation WarehouseCreate($input: WarehouseCreateInput!) {
    inventoryMutation {
      warehouseCreate(input: $input) {
        warehouse {
          ...WarehouseListFields
        }
        userErrors {
          ...WarehouseUserErrorFields
        }
      }
    }
  }
  ${WAREHOUSE_LIST_FRAGMENT}
  ${WAREHOUSE_USER_ERROR_FRAGMENT}
`;

export const WAREHOUSE_UPDATE_MUTATION = gql`
  mutation WarehouseUpdate($input: WarehouseUpdateInput!) {
    inventoryMutation {
      warehouseUpdate(input: $input) {
        warehouse {
          ...WarehouseListFields
        }
        userErrors {
          ...WarehouseUserErrorFields
        }
      }
    }
  }
  ${WAREHOUSE_LIST_FRAGMENT}
  ${WAREHOUSE_USER_ERROR_FRAGMENT}
`;

export const WAREHOUSE_DELETE_MUTATION = gql`
  mutation WarehouseDelete($input: WarehouseDeleteInput!) {
    inventoryMutation {
      warehouseDelete(input: $input) {
        deletedWarehouseId
        userErrors {
          ...WarehouseUserErrorFields
        }
      }
    }
  }
  ${WAREHOUSE_USER_ERROR_FRAGMENT}
`;
