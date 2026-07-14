"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiSearchConfigurationDeleteInput,
} from "@/graphql/types";
import { SEARCH_SYNONYM_GROUP_DELETE_MUTATION } from "../graphql";
import type {
  SearchSynonymGroupDeleteMutationData,
  SearchSynonymGroupDeleteMutationVariables,
} from "../graphql";

export function useDeleteSynonymGroup() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchSynonymGroupDeleteMutationData,
    SearchSynonymGroupDeleteMutationVariables
  >(SEARCH_SYNONYM_GROUP_DELETE_MUTATION);

  const deleteSynonymGroup = useCallback(
    async (input: ApiSearchConfigurationDeleteInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: ["SearchSynonymGroups"],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.search.synonymGroupDelete;

        return {
          synonymGroup: payload?.synonymGroup ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "An unexpected error occurred";

        return {
          synonymGroup: null,
          userErrors: [
            { code: "UNEXPECTED_ERROR", message },
          ] satisfies ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { deleteSynonymGroup, loading, error: error ?? null, reset };
}
