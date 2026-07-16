import { gql } from "@apollo/client";
import { FILE_FRAGMENT } from "@/domains/media/graphql";

export const REVIEW_DETAILS_FRAGMENT = gql`
  fragment ReviewDetailsFields on Review {
    id revision title body locale status
    sourceChannel sourceMetadata idempotencyKey
    moderationNote moderatedByPrincipalId moderatedAt
    createdAt
    author {
      type principalId displayName email
      customer { id displayName email preferredLocale }
    }
    product { id title }
    variant { id title }
    orderId orderLineId rating verificationStatus verificationMethod verifiedAt
    isVerifiedPurchase isIncentivized incentiveDisclosure
    ratings {
      value createdAt updatedAt
      criterion { id code defaultTitle weight }
    }
    metrics {
      likeCount dislikeCount reportCount openReportCount mediaCount
      childCount officialChildCount acceptedChildCount lastChildAt updatedAt
    }
    media {
      id sortIndex caption status moderationNote moderatedByPrincipalId moderatedAt createdAt updatedAt
      file { ...FileFields }
    }
    replies(first: 100, orderBy: [{ field: sortIndex, direction: asc }]) {
      edges { node {
        id revision body locale status moderationNote isOfficial sortIndex createdAt updatedAt
        author { type principalId displayName email customer { id displayName email } }
        metrics { likeCount dislikeCount reportCount openReportCount }
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
  ${FILE_FRAGMENT}
`;
