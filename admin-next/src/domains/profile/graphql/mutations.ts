import { gql } from "@apollo/client";
import { USER_FRAGMENT, USER_ERROR_FRAGMENT } from "./fragments";

/**
 * Update the current user's profile.
 * Can update firstName, lastName, and locale.
 */
export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UserUpdateProfileInput!) {
    userMutation {
      userUpdateProfile(input: $input) {
        user {
          ...UserFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update the current user's email address.
 */
export const UPDATE_EMAIL_MUTATION = gql`
  mutation UpdateEmail($input: UserUpdateEmailInput!) {
    userMutation {
      userUpdateEmail(input: $input) {
        user {
          ...UserFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update the current user's password.
 * Requires current password for verification.
 */
export const UPDATE_PASSWORD_MUTATION = gql`
  mutation UpdatePassword($input: UserUpdatePasswordInput!) {
    userMutation {
      userUpdatePassword(input: $input) {
        success
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;
