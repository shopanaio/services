import { gql } from "@apollo/client";

const USER_ERRORS = gql`fragment CustomerContentUserErrorFields on GenericUserError { code field message }`;

export const REVIEW_CONFIGURATION_QUERY = gql`
  query AdminReviewConfiguration {
    reviewsQuery { storeConfiguration {
      id reviewsEnabled questionsEnabled guestReviewsEnabled guestQuestionsEnabled customerAnswersEnabled verifiedPurchaseRequired
      reviewModerationMode questionModerationMode answerModerationMode reviewDuplicatePolicy reviewRequestsEnabled
      reviewRequestDelayDays reviewRequestExpiryDays reviewEditWindowHours questionEditWindowHours answerEditWindowHours
      maxReviewMediaCount maxAnswersPerQuestion revision createdAt updatedAt
    } }
  }
`;

export const REVIEW_CONFIGURATION_UPDATE_MUTATION = gql`
  mutation AdminReviewConfigurationUpdate($configurationId: ID!, $expectedRevision: Int!, $operations: ReviewStoreConfigurationUpdateInput) {
    reviewsMutation { storeConfigurationUpdate(configurationId: $configurationId, expectedRevision: $expectedRevision, operations: $operations) {
      configuration { id revision updatedAt } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;

export const RATING_CRITERIA_QUERY = gql`
  query AdminRatingCriteria {
    reviewsQuery { ratingCriteria(first: 100, orderBy: [{ field: sortIndex, direction: asc }]) { totalCount edges { node {
      id code defaultTitle defaultDescription weight isRequired isActive appliesToAllProducts sortIndex createdAt updatedAt deletedAt
      translations { locale title description createdAt updatedAt }
      assignments { id targetType targetId isRequiredOverride sortIndexOverride createdAt target { ... on Product { id title } ... on Category { id title: name } } }
    } } } }
  }
`;

export const RATING_CRITERION_CREATE_MUTATION = gql`
  mutation AdminRatingCriterionCreate($input: ReviewRatingCriterionCreateInput!) {
    reviewsMutation { ratingCriterionCreate(input: $input) { criterion { id updatedAt } userErrors { ...CustomerContentUserErrorFields } } }
  } ${USER_ERRORS}
`;

export const RATING_CRITERION_UPDATE_MUTATION = gql`
  mutation AdminRatingCriterionUpdate($criterionId: ID!, $expectedUpdatedAt: DateTime!, $operations: ReviewRatingCriterionUpdateInput) {
    reviewsMutation { ratingCriterionUpdate(criterionId: $criterionId, expectedUpdatedAt: $expectedUpdatedAt, operations: $operations) {
      criterion { id updatedAt } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;

export const RATING_CRITERION_DELETE_MUTATION = gql`
  mutation AdminRatingCriterionDelete($input: ReviewRatingCriterionDeleteInput!) {
    reviewsMutation { ratingCriterionDelete(input: $input) { deletedCriterionId userErrors { ...CustomerContentUserErrorFields } } }
  } ${USER_ERRORS}
`;

export const MODERATION_CONTENTS_QUERY = gql`
  query AdminModerationContents($first: Int, $after: String, $last: Int, $before: String, $where: ReviewContentWhereInput, $orderBy: [ReviewContentOrderByInput!]) {
    reviewsQuery { contents(first: $first, after: $after, last: $last, before: $before, where: $where, orderBy: $orderBy, meta: { includeDeleted: true, includeRedacted: true }) {
      totalCount edges { node { id __typename title body locale status moderationNote revision redactedAt deletedAt createdAt updatedAt
        author { type displayName email customer { id displayName } }
        metrics { likeCount dislikeCount reportCount childCount mediaCount }
      } } pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    } }
  }
`;

export const CONTENT_REPORTS_QUERY = gql`
  query AdminContentReports {
    reviewsQuery { contentReports(first: 100, orderBy: [{ field: createdAt, direction: desc }]) { totalCount edges { node {
      id reason details status assignedToPrincipalId resolutionNote resolvedByPrincipalId resolvedAt createdAt updatedAt
      reporterCustomer { id displayName email }
      content { id __typename body status author { displayName } }
    } } } }
  }
`;

export const CONTENT_REPORT_UPDATE_MUTATION = gql`
  mutation AdminContentReportUpdate($contentReportId: ID!, $expectedUpdatedAt: DateTime!, $operations: ReviewContentReportUpdateInput) {
    reviewsMutation { contentReportUpdate(contentReportId: $contentReportId, expectedUpdatedAt: $expectedUpdatedAt, operations: $operations) {
      contentReport { id status assignedToPrincipalId resolutionNote updatedAt } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;

export const MODERATION_CASES_QUERY = gql`
  query AdminModerationCases {
    reviewsQuery { moderationCases(first: 100, orderBy: [{ field: createdAt, direction: desc }]) { totalCount edges { node {
      id status priority reasonCode assignedToPrincipalId dueAt resolutionCode resolutionNote resolvedByPrincipalId resolvedAt createdAt updatedAt
      content { id __typename body status author { displayName } }
    } } } }
  }
`;

export const MODERATION_CASE_CREATE_MUTATION = gql`
  mutation AdminModerationCaseCreate($input: ReviewModerationCaseCreateInput!) {
    reviewsMutation { moderationCaseCreate(input: $input) { moderationCase { id updatedAt } userErrors { ...CustomerContentUserErrorFields } } }
  } ${USER_ERRORS}
`;

export const MODERATION_CASE_UPDATE_MUTATION = gql`
  mutation AdminModerationCaseUpdate($moderationCaseId: ID!, $expectedUpdatedAt: DateTime!, $operations: ReviewModerationCaseUpdateInput) {
    reviewsMutation { moderationCaseUpdate(moderationCaseId: $moderationCaseId, expectedUpdatedAt: $expectedUpdatedAt, operations: $operations) {
      moderationCase { id status updatedAt } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;

export const REVIEW_REQUESTS_QUERY = gql`
  query AdminReviewRequests {
    reviewsQuery { reviewRequests(first: 100, orderBy: [{ field: createdAt, direction: desc }]) { totalCount edges { node {
      id orderId orderLineId channel status locale sourceChannel providerMessageId attemptCount scheduledAt sentAt deliveredAt openedAt submittedAt expiresAt lastError createdAt updatedAt
      customer { id displayName email } product { id title } variant { id title } review { id title }
      events(first: 100) { totalCount edges { node { id type providerEventId metadata occurredAt createdAt } } }
    } } } }
  }
`;

export const REVIEW_REQUEST_CREATE_MUTATION = gql`
  mutation AdminReviewRequestCreate($input: ReviewRequestCreateInput!) {
    reviewsMutation { reviewRequestCreate(input: $input) { reviewRequest { id updatedAt } userErrors { ...CustomerContentUserErrorFields } } }
  } ${USER_ERRORS}
`;

export const REVIEW_REQUEST_UPDATE_MUTATION = gql`
  mutation AdminReviewRequestUpdate($reviewRequestId: ID!, $expectedUpdatedAt: DateTime!, $operations: ReviewRequestUpdateInput) {
    reviewsMutation { reviewRequestUpdate(reviewRequestId: $reviewRequestId, expectedUpdatedAt: $expectedUpdatedAt, operations: $operations) {
      reviewRequest { id status updatedAt } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;

export const EXTERNAL_REFERENCES_QUERY = gql`
  query AdminExternalReferences {
    reviewsQuery { contentExternalReferences(first: 100, orderBy: [{ field: updatedAt, direction: desc }]) { totalCount edges { node {
      id externalSystem externalType externalId externalUrl direction syncStatus etag contentChecksum lastSyncedAt lastError metadata createdAt updatedAt deletedAt
      content { id __typename body status author { displayName } }
    } } } }
  }
`;

export const EXTERNAL_REFERENCE_CREATE_MUTATION = gql`
  mutation AdminExternalReferenceCreate($input: ReviewContentExternalReferenceCreateInput!) {
    reviewsMutation { contentExternalReferenceCreate(input: $input) { externalReference { id updatedAt } userErrors { ...CustomerContentUserErrorFields } } }
  } ${USER_ERRORS}
`;

export const EXTERNAL_REFERENCE_UPDATE_MUTATION = gql`
  mutation AdminExternalReferenceUpdate($externalReferenceId: ID!, $expectedUpdatedAt: DateTime!, $operations: ReviewContentExternalReferenceUpdateInput) {
    reviewsMutation { contentExternalReferenceUpdate(externalReferenceId: $externalReferenceId, expectedUpdatedAt: $expectedUpdatedAt, operations: $operations) {
      externalReference { id updatedAt syncStatus } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;

export const EXTERNAL_REFERENCE_DELETE_MUTATION = gql`
  mutation AdminExternalReferenceDelete($input: ReviewContentExternalReferenceDeleteInput!) {
    reviewsMutation { contentExternalReferenceDelete(input: $input) { deletedExternalReferenceId userErrors { ...CustomerContentUserErrorFields } } }
  } ${USER_ERRORS}
`;

export const QUESTION_SUBSCRIPTION_UPDATE_MUTATION = gql`
  mutation AdminQuestionSubscriptionUpdate($subscriptionId: ID!, $expectedUpdatedAt: DateTime!, $operations: ProductQuestionSubscriptionUpdateInput) {
    reviewsMutation { productQuestionSubscriptionUpdate(subscriptionId: $subscriptionId, expectedUpdatedAt: $expectedUpdatedAt, operations: $operations) {
      subscription { id status channel locale updatedAt } operationResults { errors { ...CustomerContentUserErrorFields } } userErrors { ...CustomerContentUserErrorFields }
    } }
  } ${USER_ERRORS}
`;
