/**
 * Auth domain type definitions.
 * Re-exports API types and provides auth-specific types.
 */

// Re-export API types for convenience
export type {
  ApiUser,
  ApiAuthTokenPayload,
  ApiGenericUserError,
  ApiUserSignInInput,
  ApiUserSignUpInput,
  ApiUserSignOutInput,
  ApiUserTokenRefreshInput,
  ApiUserSignInPayload,
  ApiUserSignUpPayload,
  ApiUserSignOutPayload,
  ApiUserTokenRefreshPayload,
} from "@/graphql/types";

// Re-export context types
export type {
  AuthContextValue,
  AuthError,
  SignInInput,
  SignInResult,
  SignUpInput,
  SignUpResult,
  SignOutOptions,
  SignOutResult,
  TokenRefreshResult,
} from "../context/types";
