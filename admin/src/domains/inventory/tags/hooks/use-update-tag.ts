"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiTagUpdateInput } from "@/graphql/types";
import {
  TAG_DETAILS_QUERY,
  TAG_UPDATE_MUTATION,
  TAGS_QUERY,
} from "../graphql";
import type {
  TagMutationResult,
  TagUpdateMutationData,
  TagUpdateMutationVariables,
} from "../graphql/operation-types";

interface UseUpdateTagReturn {
  updateTag: (input: ApiTagUpdateInput) => Promise<TagMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateTag(): UseUpdateTagReturn {
  const [updateTagMutation, { loading, error, reset }] = useMutation<
    TagUpdateMutationData,
    TagUpdateMutationVariables
  >(TAG_UPDATE_MUTATION);

  const updateTag = useCallback(
    async (input: ApiTagUpdateInput): Promise<TagMutationResult> => {
      try {
        const result = await updateTagMutation({
          variables: { input },
          refetchQueries: [TAG_DETAILS_QUERY, TAGS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.tagUpdate;

        return {
          tag: payload?.tag ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          tag: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [updateTagMutation],
  );

  return {
    updateTag,
    loading,
    error: error ?? null,
    reset,
  };
}
