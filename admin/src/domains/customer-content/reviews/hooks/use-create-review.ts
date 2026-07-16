"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiReview, ApiReviewCreateInput } from "@/graphql/types";
import { REVIEW_CREATE_MUTATION, REVIEWS_QUERY } from "../graphql";
import type {
  ReviewCreateMutationData,
  ReviewCreateMutationVariables,
} from "../graphql/operation-types";

export function useCreateReview() {
  const [mutate, { loading, error, reset }] = useMutation<
    ReviewCreateMutationData,
    ReviewCreateMutationVariables
  >(REVIEW_CREATE_MUTATION);

  const createReview = useCallback(async (input: ApiReviewCreateInput): Promise<{
    review: ApiReview | null;
    userErrors: ApiGenericUserError[];
  }> => {
    try {
      const result = await mutate({
        variables: { input },
        refetchQueries: [REVIEWS_QUERY],
      });
      const payload = result.data?.reviewsMutation.reviewCreate;
      return {
        review: payload?.review ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to create review";
      return {
        review: null,
        userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
      };
    }
  }, [mutate]);

  return { createReview, loading, error: error ?? null, reset };
}
