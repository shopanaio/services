/**
 * Auth domain public API.
 * Exports all components, hooks, utilities, and types for authentication.
 */

// Components
export { AuthGuard, ProfileCompletionGuard, SessionProvider } from "./components";

// Context
export { AuthContext } from "./context";

// Hooks
export {
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
  useTokenRefresh,
  useCurrentUser,
  useSession,
} from "./hooks";

// Schemas
export {
  emailSchema,
  passwordSchema,
  confirmPasswordSchema,
  passwordWithConfirmSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

// GraphQL operations
export {
  USER_FRAGMENT,
  AUTH_TOKEN_FRAGMENT,
  USER_ERROR_FRAGMENT,
  CURRENT_USER_QUERY,
  SIGN_IN_MUTATION,
  SIGN_UP_MUTATION,
  SIGN_OUT_MUTATION,
  TOKEN_REFRESH_MUTATION,
} from "./graphql";

// Utilities
export {
  mapGraphQLErrorsToForm,
  getErrorMessage,
  createNetworkError,
} from "./utils";

// Types
