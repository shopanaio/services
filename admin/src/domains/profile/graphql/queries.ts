import { gql } from "@apollo/client";
import { SESSION_FRAGMENT } from "./fragments";

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
