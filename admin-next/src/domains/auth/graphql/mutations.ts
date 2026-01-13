import { gql } from "@apollo/client";
import {
  USER_FRAGMENT,
  AUTH_TOKEN_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "./fragments";

/**
 * GraphQL mutations for auth domain.
 * Covers sign-in, sign-up, sign-out, and token refresh operations.
 */

/**
 * Sign in with email and password.
 * Returns the authenticated user and tokens.
 */
export const SIGN_IN_MUTATION = gql`
  mutation SignIn($input: UserSignInInput!) {
    authMutation {
      signIn(input: $input) {
        user {
          ...UserFields
        }
        token {
          ...AuthTokenFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${AUTH_TOKEN_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Sign up a new user with email and password.
 * Returns the created user and authentication tokens.
 */
export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: UserSignUpInput!) {
    authMutation {
      signUp(input: $input) {
        user {
          ...UserFields
        }
        token {
          ...AuthTokenFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${AUTH_TOKEN_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Sign out the current user.
 * Can optionally sign out from all sessions.
 */
export const SIGN_OUT_MUTATION = gql`
  mutation SignOut($input: UserSignOutInput!) {
    authMutation {
      signOut(input: $input) {
        success
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Refresh access token using refresh token.
 * Returns new tokens.
 */
export const TOKEN_REFRESH_MUTATION = gql`
  mutation TokenRefresh($input: UserTokenRefreshInput!) {
    authMutation {
      tokenRefresh(input: $input) {
        token {
          ...AuthTokenFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${AUTH_TOKEN_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
