import { gql } from "@apollo/client";
import {
  WAREHOUSE_DETAILS_FRAGMENT,
  WAREHOUSE_LIST_FRAGMENT,
} from "./fragments";

export const WAREHOUSES_QUERY = gql`
  query Warehouses(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: WarehouseWhereInput
    $orderBy: [WarehouseOrderByInput!]
  ) {
    inventoryQuery {
      warehouses(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            ...WarehouseListFields
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
    }
  }
  ${WAREHOUSE_LIST_FRAGMENT}
`;

export const WAREHOUSE_DETAILS_QUERY = gql`
  query WarehouseDetails($id: ID!) {
    inventoryQuery {
      warehouse(id: $id) {
        ...WarehouseDetailsFields
      }
    }
  }
  ${WAREHOUSE_DETAILS_FRAGMENT}
`;
