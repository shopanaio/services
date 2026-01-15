import { gql } from "@apollo/client";
import { FILE_BASIC_FRAGMENT, FILE_FRAGMENT, PAGE_INFO_FRAGMENT } from "./fragments";

/**
 * GraphQL queries for media domain.
 */

// ============================================
// File Queries
// ============================================

/**
 * Get paginated list of files.
 */
export const FILES_QUERY = gql`
  query Files($first: Int, $after: String, $last: Int, $before: String) {
    mediaQuery {
      files(first: $first, after: $after, last: $last, before: $before) {
        edges {
          cursor
          node {
            ...FileBasicFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
        totalCount
      }
    }
  }
  ${FILE_BASIC_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

/**
 * Get a single file by ID.
 */
export const FILE_QUERY = gql`
  query File($id: ID!) {
    mediaQuery {
      file(id: $id) {
        ...FileFields
      }
    }
  }
  ${FILE_FRAGMENT}
`;
