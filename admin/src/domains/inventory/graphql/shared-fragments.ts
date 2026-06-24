import { gql } from "@apollo/client";

export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

export const RICH_TEXT_FRAGMENT = gql`
  fragment RichTextFields on RichText {
    text
    html
    json
  }
`;

export const FILE_FRAGMENT = gql`
  fragment FileFields on File {
    id
    url
    originalName
    ext
    mimeType
    sizeBytes
    provider
    isProcessed
    altText
    createdAt
    updatedAt
    deletedAt
    deletionState
    dimensions {
      width
      height
    }
    durationMs
    externalData {
      externalId
      providerMeta
    }
    meta
    s3Data {
      bucketId
      etag
      objectKey
      storageClass
    }
    sourceUrl
    usage {
      totalCount
      fileActive
      byEntity {
        entityType
        count
      }
    }
  }
`;
