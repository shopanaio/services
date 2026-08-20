"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiReview, ApiReviewUpdateInput } from "@/graphql/types";
import { REVIEW_UPDATE_MUTATION, REVIEWS_QUERY } from "../graphql";
import type {
  ReviewUpdateMutationData,
  ReviewUpdateMutationVariables,
} from "../graphql/operation-types";

export function useUpdateReview() {
  const [mutate, { loading, error, reset }] = useMutation<
    ReviewUpdateMutationData,
    ReviewUpdateMutationVariables
  >(REVIEW_UPDATE_MUTATION);

  const updateReview = useCallback(
    async (
      reviewId: string,
      expectedRevision: number,
      operations: ApiReviewUpdateInput,
    ): Promise<{
      review: ApiReview | null;
      userErrors: ApiGenericUserError[];
    }> => {
      try {
        const result = await mutate({
          variables: { reviewId, expectedRevision, operations },
          refetchQueries: [REVIEWS_QUERY],
        });
        const payload = result.data?.reviewsMutation.reviewUpdate;
        const operationErrors = payload?.operationResults.flatMap((item) => item.errors) ?? [];
        return {
          review: payload?.review ?? null,
          userErrors: [...(payload?.userErrors ?? []), ...operationErrors],
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to update review";
        return {
          review: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { updateReview, loading, error: error ?? null, reset };
}
