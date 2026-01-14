import { gql } from "@apollo/client";
import { USER_FRAGMENT } from "./fragments";

/**
 * Get the current authenticated user.
 */
export const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    viewer {
      me {
        ...UserFields
      }
    }
  }
  ${USER_FRAGMENT}
`;
