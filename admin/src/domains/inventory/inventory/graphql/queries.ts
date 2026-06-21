import { gql } from "@apollo/client";
import { INVENTORY_VARIANT_ROW_FRAGMENT } from "./fragments";

export const INVENTORY_VARIANTS_QUERY = gql`
  query InventoryVariants(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: VariantWhereInput
    $orderBy: [VariantOrderByInput!]
  ) {
    catalogQuery {
      variants(
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
            ...InventoryVariantRowFields
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
  ${INVENTORY_VARIANT_ROW_FRAGMENT}
`;

export const INVENTORY_DEFAULT_WAREHOUSE_QUERY = gql`
  query InventoryPageDefaultWarehouse {
    inventoryQuery {
      warehouses(first: 1, where: { isDefault: { _eq: true } }) {
        edges {
          node {
            id
            code
            name
            isDefault
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
`;
