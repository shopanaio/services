/**
 * Profile domain GraphQL operations.
 */

// Re-export all fragments
export {
  FILE_REF_FRAGMENT,
  USER_FRAGMENT,
  USER_BASIC_FRAGMENT,
  USER_ERROR_FRAGMENT,
  SESSION_FRAGMENT,
} from "./fragments";

// Re-export all queries
export { MY_SESSIONS_QUERY } from "./queries";

// Re-export all mutations
export {
  UPDATE_PROFILE_MUTATION,
  UPDATE_EMAIL_MUTATION,
  UPDATE_PASSWORD_MUTATION,
  REVOKE_SESSION_MUTATION,
  REVOKE_ALL_SESSIONS_MUTATION,
} from "./mutations";
