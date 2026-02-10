import { gql } from "@apollo/client";
import { USER_FRAGMENT } from "./fragments";

/**
 * GraphQL queries for auth domain.
 */

/**
 * Get the current authenticated user.
 * Returns null if not authenticated.
 */
export const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    userQuery {
      current {
        ...UserFields
      }
    }
  }
  ${USER_FRAGMENT}
`;
