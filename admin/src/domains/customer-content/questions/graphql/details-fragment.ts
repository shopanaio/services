import { gql } from "@apollo/client";

export const QUESTION_DETAILS_FRAGMENT = gql`
  fragment QuestionDetailsFields on ProductQuestion {
    id revision kind title body locale status answerState
    sourceChannel sourceMetadata idempotencyKey
    moderationNote moderatedByPrincipalId moderatedAt
    publishedAt unpublishedAt createdAt updatedAt deletedAt redactedAt
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
        publishedAt unpublishedAt deletedAt redactedAt isOfficial isAccepted sortIndex createdAt updatedAt
        author { type principalId displayName email customer { id displayName email } }
        metrics { likeCount dislikeCount reportCount openReportCount }
        translations { id locale title body source status revision reviewedByPrincipalId reviewedAt createdAt updatedAt }
        publications { id channel locale status scheduledAt publishedAt unpublishedAt lastError createdAt updatedAt }
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
    translations { id locale title body source status revision reviewedByPrincipalId reviewedAt createdAt updatedAt }
    publications { id channel locale status scheduledAt publishedAt unpublishedAt lastError createdAt updatedAt }
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
    moderationCases(first: 100) {
      edges { node {
        id status priority reasonCode assignedToPrincipalId dueAt resolutionCode resolutionNote
        resolvedByPrincipalId resolvedAt createdAt updatedAt
      } }
      totalCount
    }
    moderationEvents(first: 100) {
      edges { node {
        id action fromStatus toStatus actorType actorId reasonCode note isAutomated metadata createdAt
        moderationCase { id }
      } }
      totalCount
    }
    revisions(first: 100) {
      edges { node { id revision snapshot changedByType changedById changeReason createdAt } }
      totalCount
    }
    moderationSignals(first: 100) {
      edges { node { id provider signalType score verdict modelVersion evidence createdAt } }
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
