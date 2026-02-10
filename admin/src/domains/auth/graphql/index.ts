/**
 * Auth domain GraphQL operations.
 * Exports all fragments, queries, and mutations for authentication.
 */

// Re-export fragments
export {
  USER_FRAGMENT,
  AUTH_TOKEN_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "./fragments";

// Re-export queries
export { CURRENT_USER_QUERY } from "./queries";

// Re-export mutations
export {
  SIGN_IN_MUTATION,
  SIGN_UP_MUTATION,
  SIGN_OUT_MUTATION,
  TOKEN_REFRESH_MUTATION,
} from "./mutations";
