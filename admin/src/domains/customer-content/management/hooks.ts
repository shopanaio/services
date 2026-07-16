"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import type {
  ApiProductQuestionSubscriptionUpdateInput,
  ApiReviewContentExternalReferenceCreateInput,
  ApiReviewContentExternalReferenceDeleteInput,
  ApiReviewContentExternalReferenceUpdateInput,
  ApiReviewContentReportUpdateInput,
  ApiReviewContentOrderByInput,
  ApiReviewContentWhereInput,
  ApiReviewModerationCaseCreateInput,
  ApiReviewModerationCaseUpdateInput,
  ApiReviewRatingCriterionCreateInput,
  ApiReviewRatingCriterionDeleteInput,
  ApiReviewRatingCriterionUpdateInput,
  ApiReviewRequestCreateInput,
  ApiReviewRequestUpdateInput,
  ApiReviewStoreConfigurationUpdateInput,
} from "@/graphql/types";
import {
  CONTENT_REPORTS_QUERY, EXTERNAL_REFERENCES_QUERY, MODERATION_CASES_QUERY, MODERATION_CONTENTS_QUERY,
  PRODUCT_CONTENT_SUMMARIES_QUERY, RATING_CRITERIA_QUERY, REVIEW_CONFIGURATION_QUERY, REVIEW_REQUESTS_QUERY,
  CONTENT_REPORT_UPDATE_MUTATION, EXTERNAL_REFERENCE_CREATE_MUTATION, EXTERNAL_REFERENCE_DELETE_MUTATION,
  EXTERNAL_REFERENCE_UPDATE_MUTATION, MODERATION_CASE_CREATE_MUTATION, MODERATION_CASE_UPDATE_MUTATION,
  QUESTION_SUBSCRIPTION_UPDATE_MUTATION, RATING_CRITERION_CREATE_MUTATION, RATING_CRITERION_DELETE_MUTATION,
  RATING_CRITERION_UPDATE_MUTATION, REVIEW_CONFIGURATION_UPDATE_MUTATION, REVIEW_REQUEST_CREATE_MUTATION,
  REVIEW_REQUEST_UPDATE_MUTATION,
} from "./graphql";
import type { ContentReport, ContentSummary, ExternalReference, ManagementUserError, ModerationCase, RatingCriterion, ReviewConfiguration, ReviewRequest } from "./types";

type Connection<T> = { totalCount: number; edges: Array<{ node: T }>; pageInfo?: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor?: string | null; endCursor?: string | null } };
type OperationPayload<T> = { userErrors: ManagementUserError[]; operationResults?: Array<{ errors: ManagementUserError[] }>; } & T;
const errorsOf = (payload?: OperationPayload<object> | null) => [...(payload?.userErrors ?? []), ...(payload?.operationResults?.flatMap((item) => item.errors) ?? [])];

export function useReviewConfiguration() {
  return useQuery<{ reviewsQuery: { storeConfiguration: ReviewConfiguration | null } }>(REVIEW_CONFIGURATION_QUERY, { fetchPolicy: "cache-and-network" });
}
export function useRatingCriteria() {
  return useQuery<{ reviewsQuery: { ratingCriteria: Connection<RatingCriterion> } }>(RATING_CRITERIA_QUERY, { fetchPolicy: "cache-and-network" });
}
export function useModerationContents(variables: { first?: number; after?: string | null; last?: number; before?: string | null; where?: ApiReviewContentWhereInput | null; orderBy?: ApiReviewContentOrderByInput[] | null } = { first: 100 }) {
  return useQuery<{ reviewsQuery: { contents: Connection<ContentSummary> } }>(MODERATION_CONTENTS_QUERY, { variables, fetchPolicy: "cache-and-network" });
}
export function useContentReports() {
  return useQuery<{ reviewsQuery: { contentReports: Connection<ContentReport> } }>(CONTENT_REPORTS_QUERY, { fetchPolicy: "cache-and-network" });
}
export function useModerationCases() {
  return useQuery<{ reviewsQuery: { moderationCases: Connection<ModerationCase> } }>(MODERATION_CASES_QUERY, { fetchPolicy: "cache-and-network" });
}
export function useReviewRequests() {
  return useQuery<{ reviewsQuery: { reviewRequests: Connection<ReviewRequest> } }>(REVIEW_REQUESTS_QUERY, { fetchPolicy: "cache-and-network" });
}
export function useExternalReferences() {
  return useQuery<{ reviewsQuery: { contentExternalReferences: Connection<ExternalReference> } }>(EXTERNAL_REFERENCES_QUERY, { fetchPolicy: "cache-and-network" });
}
export function useProductContentSummaries(productId?: string) {
  return useQuery<{ reviewsQuery: { productReviewSummary: Record<string, unknown> | null; productQuestionSummary: Record<string, unknown> | null } }>(PRODUCT_CONTENT_SUMMARIES_QUERY, { variables: { productId: productId ?? "" }, skip: !productId, fetchPolicy: "cache-and-network" });
}

export function useManagementMutations() {
  const [configurationUpdate, configurationState] = useMutation<{ reviewsMutation: { storeConfigurationUpdate: OperationPayload<{ configuration: { id: string; revision: number; updatedAt: string } | null }> } }, { configurationId: string; expectedRevision: number; operations: ApiReviewStoreConfigurationUpdateInput }>(REVIEW_CONFIGURATION_UPDATE_MUTATION);
  const [criterionCreate, criterionCreateState] = useMutation<{ reviewsMutation: { ratingCriterionCreate: OperationPayload<{ criterion: { id: string; updatedAt: string } | null }> } }, { input: ApiReviewRatingCriterionCreateInput }>(RATING_CRITERION_CREATE_MUTATION);
  const [criterionUpdate, criterionUpdateState] = useMutation<{ reviewsMutation: { ratingCriterionUpdate: OperationPayload<{ criterion: { id: string; updatedAt: string } | null }> } }, { criterionId: string; expectedUpdatedAt: string; operations: ApiReviewRatingCriterionUpdateInput }>(RATING_CRITERION_UPDATE_MUTATION);
  const [criterionDelete, criterionDeleteState] = useMutation<{ reviewsMutation: { ratingCriterionDelete: OperationPayload<{ deletedCriterionId: string | null }> } }, { input: ApiReviewRatingCriterionDeleteInput }>(RATING_CRITERION_DELETE_MUTATION);
  const [reportUpdate, reportState] = useMutation<{ reviewsMutation: { contentReportUpdate: OperationPayload<{ contentReport: { id: string; updatedAt: string } | null }> } }, { contentReportId: string; expectedUpdatedAt: string; operations: ApiReviewContentReportUpdateInput }>(CONTENT_REPORT_UPDATE_MUTATION);
  const [caseCreate, caseCreateState] = useMutation<{ reviewsMutation: { moderationCaseCreate: OperationPayload<{ moderationCase: { id: string; updatedAt: string } | null }> } }, { input: ApiReviewModerationCaseCreateInput }>(MODERATION_CASE_CREATE_MUTATION);
  const [caseUpdate, caseUpdateState] = useMutation<{ reviewsMutation: { moderationCaseUpdate: OperationPayload<{ moderationCase: { id: string; updatedAt: string } | null }> } }, { moderationCaseId: string; expectedUpdatedAt: string; operations: ApiReviewModerationCaseUpdateInput }>(MODERATION_CASE_UPDATE_MUTATION);
  const [requestCreate, requestCreateState] = useMutation<{ reviewsMutation: { reviewRequestCreate: OperationPayload<{ reviewRequest: { id: string; updatedAt: string } | null }> } }, { input: ApiReviewRequestCreateInput }>(REVIEW_REQUEST_CREATE_MUTATION);
  const [requestUpdate, requestUpdateState] = useMutation<{ reviewsMutation: { reviewRequestUpdate: OperationPayload<{ reviewRequest: { id: string; updatedAt: string } | null }> } }, { reviewRequestId: string; expectedUpdatedAt: string; operations: ApiReviewRequestUpdateInput }>(REVIEW_REQUEST_UPDATE_MUTATION);
  const [externalCreate, externalCreateState] = useMutation<{ reviewsMutation: { contentExternalReferenceCreate: OperationPayload<{ externalReference: { id: string; updatedAt: string } | null }> } }, { input: ApiReviewContentExternalReferenceCreateInput }>(EXTERNAL_REFERENCE_CREATE_MUTATION);
  const [externalUpdate, externalUpdateState] = useMutation<{ reviewsMutation: { contentExternalReferenceUpdate: OperationPayload<{ externalReference: { id: string; updatedAt: string } | null }> } }, { externalReferenceId: string; expectedUpdatedAt: string; operations: ApiReviewContentExternalReferenceUpdateInput }>(EXTERNAL_REFERENCE_UPDATE_MUTATION);
  const [externalDelete, externalDeleteState] = useMutation<{ reviewsMutation: { contentExternalReferenceDelete: OperationPayload<{ deletedExternalReferenceId: string | null }> } }, { input: ApiReviewContentExternalReferenceDeleteInput }>(EXTERNAL_REFERENCE_DELETE_MUTATION);
  const [subscriptionUpdate, subscriptionState] = useMutation<{ reviewsMutation: { productQuestionSubscriptionUpdate: OperationPayload<{ subscription: { id: string; updatedAt: string } | null }> } }, { subscriptionId: string; expectedUpdatedAt: string; operations: ApiProductQuestionSubscriptionUpdateInput }>(QUESTION_SUBSCRIPTION_UPDATE_MUTATION);

  const run = useCallback(async <T extends object>(promise: Promise<{ data?: { reviewsMutation: T } | null }>, key: keyof T) => {
    const result = await promise; const payload = result.data?.reviewsMutation[key] as OperationPayload<Record<string, unknown>> | undefined;
    return { payload: payload ?? null, errors: errorsOf(payload) };
  }, []);

  return {
    updateConfiguration: (configurationId: string, expectedRevision: number, operations: ApiReviewStoreConfigurationUpdateInput) => run(configurationUpdate({ variables: { configurationId, expectedRevision, operations } }), "storeConfigurationUpdate"),
    createCriterion: (input: ApiReviewRatingCriterionCreateInput) => run(criterionCreate({ variables: { input } }), "ratingCriterionCreate"),
    updateCriterion: (criterionId: string, expectedUpdatedAt: string, operations: ApiReviewRatingCriterionUpdateInput) => run(criterionUpdate({ variables: { criterionId, expectedUpdatedAt, operations } }), "ratingCriterionUpdate"),
    deleteCriterion: (input: ApiReviewRatingCriterionDeleteInput) => run(criterionDelete({ variables: { input } }), "ratingCriterionDelete"),
    updateReport: (contentReportId: string, expectedUpdatedAt: string, operations: ApiReviewContentReportUpdateInput) => run(reportUpdate({ variables: { contentReportId, expectedUpdatedAt, operations } }), "contentReportUpdate"),
    createCase: (input: ApiReviewModerationCaseCreateInput) => run(caseCreate({ variables: { input } }), "moderationCaseCreate"),
    updateCase: (moderationCaseId: string, expectedUpdatedAt: string, operations: ApiReviewModerationCaseUpdateInput) => run(caseUpdate({ variables: { moderationCaseId, expectedUpdatedAt, operations } }), "moderationCaseUpdate"),
    createRequest: (input: ApiReviewRequestCreateInput) => run(requestCreate({ variables: { input } }), "reviewRequestCreate"),
    updateRequest: (reviewRequestId: string, expectedUpdatedAt: string, operations: ApiReviewRequestUpdateInput) => run(requestUpdate({ variables: { reviewRequestId, expectedUpdatedAt, operations } }), "reviewRequestUpdate"),
    createExternalReference: (input: ApiReviewContentExternalReferenceCreateInput) => run(externalCreate({ variables: { input } }), "contentExternalReferenceCreate"),
    updateExternalReference: (externalReferenceId: string, expectedUpdatedAt: string, operations: ApiReviewContentExternalReferenceUpdateInput) => run(externalUpdate({ variables: { externalReferenceId, expectedUpdatedAt, operations } }), "contentExternalReferenceUpdate"),
    deleteExternalReference: (input: ApiReviewContentExternalReferenceDeleteInput) => run(externalDelete({ variables: { input } }), "contentExternalReferenceDelete"),
    updateSubscription: (subscriptionId: string, expectedUpdatedAt: string, operations: ApiProductQuestionSubscriptionUpdateInput) => run(subscriptionUpdate({ variables: { subscriptionId, expectedUpdatedAt, operations } }), "productQuestionSubscriptionUpdate"),
    loading: [configurationState, criterionCreateState, criterionUpdateState, criterionDeleteState, reportState, caseCreateState, caseUpdateState, requestCreateState, requestUpdateState, externalCreateState, externalUpdateState, externalDeleteState, subscriptionState].some((item) => item.loading),
  };
}
