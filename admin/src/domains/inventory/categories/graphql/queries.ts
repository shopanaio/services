import { gql } from "@apollo/client";
import { CATEGORY_LIST_FRAGMENT } from "./fragments";

export const CATEGORIES_QUERY = gql`
  query Categories(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CategoryWhereInput
    $orderBy: [CategoryOrderByInput!]
  ) {
    catalogQuery {
      categories(
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
