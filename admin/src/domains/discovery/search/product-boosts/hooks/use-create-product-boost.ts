"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiSearchProductBoostCreateInput } from "@/graphql/types";
import { SEARCH_PRODUCT_BOOST_CREATE_MUTATION } from "../graphql";
import type {
  SearchProductBoostCreateMutationData,
  SearchProductBoostCreateMutationVariables,
} from "../graphql";

export function useCreateProductBoost() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchProductBoostCreateMutationData,
    SearchProductBoostCreateMutationVariables
  >(SEARCH_PRODUCT_BOOST_CREATE_MUTATION);

  const createProductBoost = useCallback(
    async (input: ApiSearchProductBoostCreateInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: ["SearchProductBoosts"],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.search.productBoostCreate;
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

  return { createProductBoost, loading, error: error ?? null, reset };
}
