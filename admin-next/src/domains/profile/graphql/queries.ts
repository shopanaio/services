import { gql } from "@apollo/client";
import { USER_FRAGMENT, SESSION_FRAGMENT } from "./fragments";

/**
 * Get the current authenticated user.
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

/**
 * Get all active sessions for the current user.
 */
export const MY_SESSIONS_QUERY = gql`
  query MySessions {
    userQuery {
      mySessions {
        ...SessionFields
      }
    }
  }
  ${SESSION_FRAGMENT}
`;
