import { gql } from "@apollo/client";
import {
  PRODUCT_DETAILS_FRAGMENT,
  PRODUCT_LIST_FRAGMENT,
} from "./fragments";

export const PRODUCTS_QUERY = gql`
  query Products($first: Int, $after: String, $last: Int, $before: String) {
    catalogQuery {
      products(first: $first, after: $after, last: $last, before: $before) {
        edges {
          cursor
          node {
            ...ProductListFields
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
  ${PRODUCT_LIST_FRAGMENT}
`;

export const PRODUCT_DETAILS_QUERY = gql`
  query ProductDetails(
    $id: ID!
    $variantsFirst: Int
    $variantsAfter: String
  ) {
    catalogQuery {
      product(id: $id) {
        ...ProductDetailsFields
      }
    }
  }
  ${PRODUCT_DETAILS_FRAGMENT}
`;
