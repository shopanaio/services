"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiSearchSynonymGroupCreateInput } from "@/graphql/types";
import { SEARCH_SYNONYM_GROUP_CREATE_MUTATION } from "../graphql";
import type {
  SearchSynonymGroupCreateMutationData,
  SearchSynonymGroupCreateMutationVariables,
} from "../graphql";

export function useCreateSynonymGroup() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchSynonymGroupCreateMutationData,
    SearchSynonymGroupCreateMutationVariables
  >(SEARCH_SYNONYM_GROUP_CREATE_MUTATION);

  const createSynonymGroup = useCallback(
    async (input: ApiSearchSynonymGroupCreateInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: ["SearchSynonymGroups"],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.search.synonymGroupCreate;
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

  return { createSynonymGroup, loading, error: error ?? null, reset };
}
