import { gql } from "@apollo/client";
import { TAG_DETAILS_FRAGMENT, TAG_LIST_FRAGMENT } from "./fragments";

export const TAGS_QUERY = gql`
  query Tags($first: Int, $after: String, $last: Int, $before: String) {
    catalogQuery {
      tags(first: $first, after: $after, last: $last, before: $before) {
        edges {
          cursor
          node {
            ...TagListFields
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
        ...TagDetailsFields
      }
    }
  }
  ${TAG_DETAILS_FRAGMENT}
`;
