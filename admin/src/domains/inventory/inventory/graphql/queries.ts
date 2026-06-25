import { gql } from "@apollo/client";
import { INVENTORY_ITEM_ROW_FRAGMENT } from "./fragments";

export const INVENTORY_ITEMS_QUERY = gql`
  query InventoryItems(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: InventoryItemWhereInput
    $orderBy: [InventoryItemOrderByInput!]
    $meta: InventoryItemInventoryItemsMetaInput
  ) {
    inventoryQuery {
      inventoryItems(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
        meta: $meta
      ) {
        edges {
          cursor
          node {
            ...InventoryItemRowFields
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
  ${INVENTORY_ITEM_ROW_FRAGMENT}
`;

export const INVENTORY_VARIANTS_QUERY = INVENTORY_ITEMS_QUERY;
