import { gql } from "@apollo/client";
import { SEARCH_SYNONYM_GROUP_LIST_FRAGMENT } from "./fragments";

export const SEARCH_SYNONYM_GROUPS_QUERY = gql`
  query SearchSynonymGroups(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: SearchSynonymGroupWhereInput
    $orderBy: [SearchSynonymGroupOrderByInput!]
  ) {
    listingQuery {
      search {
        synonymGroups(
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
              ...SearchSynonymGroupListFields
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
  ${SEARCH_SYNONYM_GROUP_LIST_FRAGMENT}
`;
