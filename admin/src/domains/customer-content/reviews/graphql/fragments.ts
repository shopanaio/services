import { gql } from "@apollo/client";
import { FILE_FRAGMENT } from "@/domains/media/graphql";

export const REVIEW_LIST_FRAGMENT = gql`
  fragment ReviewListFields on Review {
    id
    title
    body
    rating
    status
    isVerifiedPurchase
    verificationStatus
    createdAt
    updatedAt
    product {
      id
      title
    }
    author {
      type
      displayName
      email
      customer {
        id
      }
    }
    metrics {
      likeCount
      dislikeCount
      reportCount
      openReportCount
      mediaCount
    }
  }
`;

export const REVIEW_EDITOR_FRAGMENT = gql`
  fragment ReviewEditorFields on Review {
    ...ReviewListFields
    revision
    locale
    moderationNote
    moderatedAt
    media {
      id
      sortIndex
      caption
      status
      file {
        ...FileFields
      }
    }
    reports(first: 50) {
      edges {
        node {
          id
          reason
          details
          status
          createdAt
          reporterCustomer {
            id
            displayName
            email
          }
        }
      }
      totalCount
    }
    author {
      type
      displayName
      email
      customer {
        id
        displayName
        email
        preferredLocale
      }
    }
  }
  ${REVIEW_LIST_FRAGMENT}
  ${FILE_FRAGMENT}
`;
