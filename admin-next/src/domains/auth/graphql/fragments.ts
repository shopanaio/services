import { gql } from "@apollo/client";

/**
 * GraphQL fragments for auth domain.
 * These fragments define the fields we need for authentication operations.
 */

/**
 * User fields fragment - full user information for auth responses.
 */
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    avatar
    locale
    isAdmin
    emailVerified
    isDeleted
    isForbidden
    isProfileComplete
    createdAt
    updatedAt
  }
`;

/**
 * Auth token fields fragment - JWT and refresh tokens.
 */
export const AUTH_TOKEN_FRAGMENT = gql`
  fragment AuthTokenFields on AuthTokenPayload {
    accessToken
    refreshToken
    expiresIn
  }
`;

/**
 * Generic user error fields fragment - error handling.
 */
export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;
