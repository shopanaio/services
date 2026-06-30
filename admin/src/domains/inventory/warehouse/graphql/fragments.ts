import { gql } from "@apollo/client";

export const WAREHOUSE_USER_ERROR_FRAGMENT = gql`
  fragment WarehouseUserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

export const WAREHOUSE_LIST_FRAGMENT = gql`
  fragment WarehouseListFields on Warehouse {
    id
    code
    name
    isDefault
    variantsCount
    createdAt
    updatedAt
  }
`;

export const WAREHOUSE_DETAILS_FRAGMENT = gql`
  fragment WarehouseDetailsFields on Warehouse {
    id
    code
    name
    isDefault
    variantsCount
    createdAt
    updatedAt
  }
`;
