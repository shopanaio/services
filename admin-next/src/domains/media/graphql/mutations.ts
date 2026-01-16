import { gql } from "@apollo/client";
import { FILE_FRAGMENT } from "./fragments";

/**
 * GraphQL mutations for media domain.
 */

// ============================================
// User Error Fragment
// ============================================

export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

// ============================================
// File Upload Mutations
// ============================================

/**
 * Upload a file via multipart form data.
 */
export const FILE_UPLOAD_MUTATION = gql`
  mutation FileUpload($input: FileUploadMultipartInput!) {
    mediaMutation {
      fileUpload(input: $input) {
        file {
          ...FileFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FILE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Upload a file from URL.
 */
export const FILE_UPLOAD_FROM_URL_MUTATION = gql`
  mutation FileUploadFromUrl($input: FileUploadFromUrlInput!) {
    mediaMutation {
      fileUploadFromUrl(input: $input) {
        file {
          ...FileFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FILE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Create an external media file (YouTube, Vimeo, etc).
 */
export const FILE_CREATE_EXTERNAL_MUTATION = gql`
  mutation FileCreateExternal($input: FileCreateExternalInput!) {
    mediaMutation {
      fileCreateExternal(input: $input) {
        file {
          ...FileFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FILE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Upload avatar or logo for a user or organization.
 * The file is stored in the entity's asset group.
 */
export const AVATAR_UPLOAD_MUTATION = gql`
  mutation AvatarUpload($input: AvatarUploadInput!) {
    mediaMutation {
      avatarUpload(input: $input) {
        file {
          ...FileFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FILE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
