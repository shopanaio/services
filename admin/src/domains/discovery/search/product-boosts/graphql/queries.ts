import { gql } from "@apollo/client";
import { SEARCH_PRODUCT_BOOST_LIST_FRAGMENT } from "./fragments";

export const SEARCH_PRODUCT_BOOSTS_QUERY = gql`
  query SearchProductBoosts(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: SearchProductBoostWhereInput
    $orderBy: [SearchProductBoostOrderByInput!]
  ) {
    listingQuery {
      search {
        productBoosts(
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
              ...SearchProductBoostListFields
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
  ${SEARCH_PRODUCT_BOOST_LIST_FRAGMENT}
`;
