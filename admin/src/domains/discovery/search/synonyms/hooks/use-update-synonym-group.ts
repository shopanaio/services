"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiSearchSynonymGroupUpdateInput } from "@/graphql/types";
import { SEARCH_SYNONYM_GROUP_UPDATE_MUTATION } from "../graphql";
import type {
  SearchSynonymGroupUpdateMutationData,
  SearchSynonymGroupUpdateMutationVariables,
} from "../graphql";

export function useUpdateSynonymGroup() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchSynonymGroupUpdateMutationData,
    SearchSynonymGroupUpdateMutationVariables
  >(SEARCH_SYNONYM_GROUP_UPDATE_MUTATION);

  const updateSynonymGroup = useCallback(
    async (input: ApiSearchSynonymGroupUpdateInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: ["SearchSynonymGroups"],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.search.synonymGroupUpdate;
        return {
          synonymGroup: payload?.synonymGroup ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "An unexpected error occurred";
        return {
          synonymGroup: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] satisfies ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { updateSynonymGroup, loading, error: error ?? null, reset };
}
