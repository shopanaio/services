"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiSearchProductBoostUpdateInput } from "@/graphql/types";
import { SEARCH_PRODUCT_BOOST_UPDATE_MUTATION } from "../graphql";
import type {
  SearchProductBoostUpdateMutationData,
  SearchProductBoostUpdateMutationVariables,
} from "../graphql";

export function useUpdateProductBoost() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchProductBoostUpdateMutationData,
    SearchProductBoostUpdateMutationVariables
  >(SEARCH_PRODUCT_BOOST_UPDATE_MUTATION);

  const updateProductBoost = useCallback(
    async (input: ApiSearchProductBoostUpdateInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: ["SearchProductBoosts"],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.search.productBoostUpdate;
        return {
          productBoost: payload?.productBoost ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "An unexpected error occurred";
        return {
          productBoost: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] satisfies ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { updateProductBoost, loading, error: error ?? null, reset };
}
