import { gql } from "@apollo/client";

/**
 * GraphQL fragments for media domain.
 * Covers file entities with various levels of detail.
 */

// ============================================
// File Fragments
// ============================================

/**
 * Basic file fields for list views.
 */
export const FILE_BASIC_FRAGMENT = gql`
  fragment FileBasicFields on File {
    id
    url
    mimeType
    ext
    sizeBytes
    originalName
    provider
    createdAt
    deletedAt
    deletionState
  }
`;

/**
 * File dimensions fragment.
 */
export const FILE_DIMENSIONS_FRAGMENT = gql`
  fragment FileDimensionsFields on MediaDimensions {
    width
    height
  }
`;

/**
 * Full file fields including dimensions and metadata.
 */
export const FILE_FRAGMENT = gql`
  fragment FileFields on File {
    id
    url
    mimeType
    ext
    sizeBytes
    originalName
    provider
    altText
    sourceUrl
    isProcessed
    meta
    createdAt
    updatedAt
    deletedAt
    dimensions {
      ...FileDimensionsFields
    }
    durationMs
  }
  ${FILE_DIMENSIONS_FRAGMENT}
`;

/**
 * PageInfo fragment for cursor pagination.
 */
export const PAGE_INFO_FRAGMENT = gql`
  fragment PageInfoFields on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;
