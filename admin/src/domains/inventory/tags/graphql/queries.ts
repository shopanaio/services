import { gql } from "@apollo/client";
import { TAG_DETAILS_FRAGMENT, TAG_LIST_FRAGMENT } from "./fragments";

export const TAGS_QUERY = gql`
  query Tags(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: TagWhereInput
    $orderBy: [TagOrderByInput!]
  ) {
    catalogQuery {
      tags(
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
            ...TagFields
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
  ${TAG_LIST_FRAGMENT}
`;

export const TAG_DETAILS_QUERY = gql`
  query TagDetails($id: ID!) {
    catalogQuery {
      tag(id: $id) {
        ...TagFields
      }
    }
  }
  ${TAG_DETAILS_FRAGMENT}
`;
