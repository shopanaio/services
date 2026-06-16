import { gql } from "@apollo/client";

/**
 * File reference fragment - minimal fields for avatar/logo
 */
export const FILE_REF_FRAGMENT = gql`
  fragment FileRefFields on File {
    id
    url
  }
`;

/**
 * User fragment - basic user information
 */
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    avatar {
      ...FileRefFields
    }
    locale
    isAdmin
    emailVerified
    isDeleted
    isForbidden
    isProfileComplete
    createdAt
    updatedAt
  }
  ${FILE_REF_FRAGMENT}
`;

/**
 * User fragment - minimal info for lists and references
 */
export const USER_BASIC_FRAGMENT = gql`
  fragment UserBasicFields on User {
    id
    email
    firstName
    lastName
    avatar {
      ...FileRefFields
    }
  }
  ${FILE_REF_FRAGMENT}
`;

/**
 * Generic user error fragment
 */
export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

/**
 * Session fragment - user session information
 */
export const SESSION_FRAGMENT = gql`
  fragment SessionFields on Session {
    id
    ipAddress
    userAgent
    expiresAt
    isCurrent
    createdAt
    updatedAt
  }
`;
