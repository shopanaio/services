"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiReviewContentDeleteInput } from "@/graphql/types";
import {
  CONTENT_REDACT_MUTATION,
  CONTENT_REVISION_RESTORE_MUTATION,
  QUESTION_DELETE_MUTATION,
  REVIEW_DELETE_MUTATION,
} from "../graphql/actions";

type MutationErrors = { userErrors: ApiGenericUserError[]; operationResults?: Array<{ errors: ApiGenericUserError[] }> };
type ReviewDeleteData = { reviewsMutation: { reviewDelete: MutationErrors & { deletedReviewId?: string | null } } };
type QuestionDeleteData = { reviewsMutation: { productQuestionDelete: MutationErrors & { deletedProductQuestionId?: string | null } } };
type ContentUpdateData<K extends "contentRedact" | "contentRevisionRestore"> = { reviewsMutation: Record<K, MutationErrors & { content?: { id: string; revision: number; updatedAt: string } | null }> };

function collectErrors(payload?: MutationErrors | null) {
  return [...(payload?.userErrors ?? []), ...(payload?.operationResults?.flatMap((item) => item.errors) ?? [])];
}

export function useContentActions() {
  const [deleteReviewMutation, deleteReviewState] = useMutation<ReviewDeleteData, { input: ApiReviewContentDeleteInput }>(REVIEW_DELETE_MUTATION);
  const [deleteQuestionMutation, deleteQuestionState] = useMutation<QuestionDeleteData, { input: ApiReviewContentDeleteInput }>(QUESTION_DELETE_MUTATION);
  const [redactMutation, redactState] = useMutation<ContentUpdateData<"contentRedact">, { contentId: string; expectedRevision: number }>(CONTENT_REDACT_MUTATION);
  const [restoreMutation, restoreState] = useMutation<ContentUpdateData<"contentRevisionRestore">, { contentId: string; revision: number; expectedRevision: number }>(CONTENT_REVISION_RESTORE_MUTATION);

  const deleteReview = useCallback(async (input: ApiReviewContentDeleteInput) => {
    const result = await deleteReviewMutation({ variables: { input } });
    const payload = result.data?.reviewsMutation.reviewDelete;
    return { id: payload?.deletedReviewId ?? null, errors: collectErrors(payload) };
  }, [deleteReviewMutation]);

  const deleteQuestion = useCallback(async (input: ApiReviewContentDeleteInput) => {
    const result = await deleteQuestionMutation({ variables: { input } });
    const payload = result.data?.reviewsMutation.productQuestionDelete;
    return { id: payload?.deletedProductQuestionId ?? null, errors: collectErrors(payload) };
  }, [deleteQuestionMutation]);

  const redact = useCallback(async (contentId: string, expectedRevision: number) => {
    const result = await redactMutation({ variables: { contentId, expectedRevision } });
    const payload = result.data?.reviewsMutation.contentRedact;
    return { content: payload?.content ?? null, errors: collectErrors(payload) };
  }, [redactMutation]);

  const restoreRevision = useCallback(async (contentId: string, revision: number, expectedRevision: number) => {
    const result = await restoreMutation({ variables: { contentId, revision, expectedRevision } });
    const payload = result.data?.reviewsMutation.contentRevisionRestore;
    return { content: payload?.content ?? null, errors: collectErrors(payload) };
  }, [restoreMutation]);

  return {
    deleteReview,
    deleteQuestion,
    redact,
    restoreRevision,
    loading: deleteReviewState.loading || deleteQuestionState.loading || redactState.loading || restoreState.loading,
    error: deleteReviewState.error ?? deleteQuestionState.error ?? redactState.error ?? restoreState.error ?? null,
  };
}
