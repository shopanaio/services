"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiTagCreateInput } from "@/graphql/types";
import { TAG_CREATE_MUTATION, TAGS_QUERY } from "../graphql";
import type {
  TagCreateMutationData,
  TagCreateMutationVariables,
  TagMutationResult,
} from "../graphql";

interface UseCreateTagReturn {
  createTag: (input: ApiTagCreateInput) => Promise<TagMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateTag(): UseCreateTagReturn {
  const [createTagMutation, { loading, error, reset }] = useMutation<
    TagCreateMutationData,
    TagCreateMutationVariables
  >(TAG_CREATE_MUTATION);

  const createTag = useCallback(
    async (input: ApiTagCreateInput): Promise<TagMutationResult> => {
      try {
        const result = await createTagMutation({
          variables: { input },
          refetchQueries: [TAGS_QUERY],
        });
        const payload = result.data?.catalogMutation.tagCreate;

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
    [createTagMutation],
  );

  return {
    createTag,
    loading,
    error: error ?? null,
    reset,
  };
}
