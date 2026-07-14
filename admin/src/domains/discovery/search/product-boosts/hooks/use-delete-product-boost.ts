"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiSearchConfigurationDeleteInput,
} from "@/graphql/types";
import { SEARCH_PRODUCT_BOOST_DELETE_MUTATION } from "../graphql";
import type {
  SearchProductBoostDeleteMutationData,
  SearchProductBoostDeleteMutationVariables,
} from "../graphql";

export function useDeleteProductBoost() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchProductBoostDeleteMutationData,
    SearchProductBoostDeleteMutationVariables
  >(SEARCH_PRODUCT_BOOST_DELETE_MUTATION);

  const deleteProductBoost = useCallback(
    async (input: ApiSearchConfigurationDeleteInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: ["SearchProductBoosts"],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.search.productBoostDelete;

        return {
          productBoost: payload?.productBoost ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "An unexpected error occurred";

        return {
          productBoost: null,
          userErrors: [
            { code: "UNEXPECTED_ERROR", message },
          ] satisfies ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { deleteProductBoost, loading, error: error ?? null, reset };
}
