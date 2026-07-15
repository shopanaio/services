import { gql } from "@apollo/client";

export const REVIEW_EDITOR_FRAGMENT = gql`
  fragment ReviewEditorFields on Review {
    id
    version
    title
    body
    rating
    status
    isVerifiedPurchase
    likeCount
    dislikeCount
    reportedCount
    reports {
      id
      reason
      details
      createdAt
      reporter {
        id
        displayName
        email
      }
    }
    mediaCount
    media {
      id
      url
      originalName
      altText
      mimeType
      ext
      sizeBytes
      durationMs
      dimensions {
        width
        height
      }
    }
    moderationNote
    moderatedAt
    createdAt
    updatedAt
    product {
      id
      title
    }
    customer {
      id
      displayName
      email
    }
  }
`;
