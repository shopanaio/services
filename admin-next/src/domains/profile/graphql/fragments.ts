import { gql } from "@apollo/client";

/**
 * User fragment - basic user information
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
    createdAt
    updatedAt
  }
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
    avatar
  }
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
