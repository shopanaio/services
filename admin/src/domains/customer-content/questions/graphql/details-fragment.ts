import { gql } from "@apollo/client";

export const QUESTION_DETAILS_FRAGMENT = gql`
  fragment QuestionDetailsFields on ProductQuestion {
    id revision title body locale status answerState
    sourceChannel sourceMetadata idempotencyKey
    moderationNote moderatedByPrincipalId moderatedAt
    createdAt
    author {
      type principalId displayName email
      customer { id displayName email preferredLocale }
    }
    product { id title }
    variant { id title }
    metrics {
      likeCount dislikeCount reportCount openReportCount childCount officialChildCount
      acceptedChildCount lastChildAt updatedAt
    }
    answers(first: 100, orderBy: [{ field: sortIndex, direction: asc }]) {
      edges { node {
        id revision body locale status moderationNote moderatedByPrincipalId moderatedAt
        isOfficial isAccepted sortIndex createdAt updatedAt
        author { type principalId displayName email customer { id displayName email } }
        metrics { likeCount dislikeCount reportCount openReportCount }
      } }
      totalCount
    }
    subscriptions(first: 100) {
      edges { node {
        id channel status locale lastNotifiedAt createdAt updatedAt
        subscriberCustomer { id displayName email }
      } }
      totalCount
    }
    votes(first: 100) {
      edges { node { id type createdAt updatedAt voterCustomer { id displayName email } } }
      totalCount
    }
    reports(first: 100) {
      edges { node {
        id reason details status assignedToPrincipalId resolutionNote resolvedByPrincipalId resolvedAt createdAt updatedAt
        reporterCustomer { id displayName email }
      } }
      totalCount
    }
    externalReferences(first: 100) {
      edges { node {
        id externalSystem externalType externalId externalUrl direction syncStatus etag contentChecksum
        lastSyncedAt lastError metadata createdAt updatedAt deletedAt
      } }
      totalCount
    }
  }
`;
