"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiReviewContentDeleteInput } from "@/graphql/types";
import {
  CONTENT_REDACT_MUTATION,
  QUESTION_DELETE_MUTATION,
  REVIEW_DELETE_MUTATION,
} from "../graphql/actions";

type MutationErrors = {
  userErrors: ApiGenericUserError[];
  operationResults?: Array<{ errors: ApiGenericUserError[] }>;
};
type ReviewDeleteData = {
  reviewsMutation: { reviewDelete: MutationErrors & { deletedReviewId?: string | null } };
};
type QuestionDeleteData = {
  reviewsMutation: {
    productQuestionDelete: MutationErrors & { deletedProductQuestionId?: string | null };
  };
};
type ContentUpdateData = {
  reviewsMutation: {
    contentRedact: MutationErrors & {
      content?: { id: string; revision: number; updatedAt: string } | null;
    };
  };
};

function collectErrors(payload?: MutationErrors | null) {
  return [
    ...(payload?.userErrors ?? []),
    ...(payload?.operationResults?.flatMap((item) => item.errors) ?? []),
  ];
}

export function useContentActions() {
  const [deleteReviewMutation, deleteReviewState] = useMutation<
    ReviewDeleteData,
    { input: ApiReviewContentDeleteInput }
  >(REVIEW_DELETE_MUTATION);
  const [deleteQuestionMutation, deleteQuestionState] = useMutation<
    QuestionDeleteData,
    { input: ApiReviewContentDeleteInput }
  >(QUESTION_DELETE_MUTATION);
  const [redactMutation, redactState] = useMutation<ContentUpdateData, { contentId: string }>(
    CONTENT_REDACT_MUTATION,
  );

  const deleteReview = useCallback(
    async (input: ApiReviewContentDeleteInput) => {
      const result = await deleteReviewMutation({ variables: { input } });
      const payload = result.data?.reviewsMutation.reviewDelete;
      return { id: payload?.deletedReviewId ?? null, errors: collectErrors(payload) };
    },
    [deleteReviewMutation],
  );

  const deleteQuestion = useCallback(
    async (input: ApiReviewContentDeleteInput) => {
      const result = await deleteQuestionMutation({ variables: { input } });
      const payload = result.data?.reviewsMutation.productQuestionDelete;
      return { id: payload?.deletedProductQuestionId ?? null, errors: collectErrors(payload) };
    },
    [deleteQuestionMutation],
  );

  const redact = useCallback(
    async (contentId: string) => {
      const result = await redactMutation({ variables: { contentId } });
      const payload = result.data?.reviewsMutation.contentRedact;
      return { content: payload?.content ?? null, errors: collectErrors(payload) };
    },
    [redactMutation],
  );

  return {
    deleteReview,
    deleteQuestion,
    redact,
    loading: deleteReviewState.loading || deleteQuestionState.loading || redactState.loading,
    error: deleteReviewState.error ?? deleteQuestionState.error ?? redactState.error ?? null,
  };
}
