/**
 * Profile domain GraphQL operations.
 */

// Re-export all fragments
export {
  USER_FRAGMENT,
  USER_BASIC_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "./fragments";

// Re-export all queries
export { CURRENT_USER_QUERY } from "./queries";

// Re-export all mutations
export {
  UPDATE_PROFILE_MUTATION,
  UPDATE_EMAIL_MUTATION,
  UPDATE_PASSWORD_MUTATION,
} from "./mutations";
