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

// ============================================
// File Delete Mutations
// ============================================

/**
 * Delete multiple files (soft delete by default, hard delete optional).
 */
export const FILE_DELETE_MANY_MUTATION = gql`
  mutation FileDeleteMany($input: FileDeleteManyInput!) {
    mediaMutation {
      fileDeleteMany(input: $input) {
        acceptedIds
        startedHardDeleteIds
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/** Restore multiple soft-deleted files. */
export const FILE_RESTORE_MANY_MUTATION = gql`
  mutation FileRestoreMany($input: FileRestoreManyInput!) {
    mediaMutation {
      fileRestoreMany(input: $input) {
        restoredIds
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/** Clear a deletion error so the file can be retried or restored. */
export const FILE_CLEAR_ERROR_MUTATION = gql`
  mutation FileClearError($input: FileClearErrorInput!) {
    mediaMutation {
      fileClearError(input: $input) {
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
