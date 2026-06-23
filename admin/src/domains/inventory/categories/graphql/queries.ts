import { gql } from "@apollo/client";
import {
  CATEGORY_DETAILS_FRAGMENT,
  CATEGORY_LIST_FRAGMENT,
  CATEGORY_PRODUCT_LIST_ITEM_FRAGMENT,
} from "./fragments";

export const CATEGORIES_QUERY = gql`
  query Categories(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CategoryWhereInput
    $orderBy: [CategoryOrderByInput!]
    $meta: CategoryCategoriesMetaInput
  ) {
    catalogQuery {
      categories(
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
            ...CategoryListFields
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
  ${CATEGORY_LIST_FRAGMENT}
`;

export const CATEGORY_DETAILS_QUERY = gql`
  query CategoryDetails($id: ID!) {
    catalogQuery {
      category(id: $id) {
        ...CategoryDetailsFields
      }
    }
  }
  ${CATEGORY_DETAILS_FRAGMENT}
`;

export const CATEGORY_PRODUCTS_QUERY = gql`
  query CategoryProducts(
    $id: ID!
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CategoryProductWhereInput
    $orderBy: [ProductOrderByInput!]
  ) {
    catalogQuery {
      category(id: $id) {
        id
        products(
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
              ...CategoryProductListItemFields
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
  }
  ${CATEGORY_PRODUCT_LIST_ITEM_FRAGMENT}
`;
