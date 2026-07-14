"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiSearchSettingsOperationResult,
  ApiSearchSettingsOperationsInput,
} from "@/graphql/types";
import { SEARCH_SETTINGS_UPDATE_MUTATION } from "../graphql";
import type {
  SearchSettingsUpdateMutationData,
  SearchSettingsUpdateMutationVariables,
} from "../graphql";

export interface SearchSettingsUpdateResult {
  applied: boolean;
  operationResult: ApiSearchSettingsOperationResult | null;
  userErrors: ApiGenericUserError[];
}

export function useUpdateSearchSettings() {
  const [mutate, { loading, error, reset }] = useMutation<
    SearchSettingsUpdateMutationData,
    SearchSettingsUpdateMutationVariables
  >(SEARCH_SETTINGS_UPDATE_MUTATION);

  const updateSearchSettings = useCallback(
    async (
      expectedVersion: number,
      operations: ApiSearchSettingsOperationsInput,
    ): Promise<SearchSettingsUpdateResult> => {
      try {
        const result = await mutate({
          variables: { expectedVersion, operations },
        });
        const payload = result.data?.listingMutation.search.settingsUpdate;
        const operationResult =
          payload?.operationResults[0] ?? null;
        const userErrors: ApiGenericUserError[] = [
          ...(payload?.userErrors ?? []),
          ...(operationResult?.errors ?? []),
        ];
        if (!operationResult) {
          userErrors.push({
            code: "UNEXPECTED_OPERATION_RESULT",
            message: "Search update returned an unexpected operation result.",
          });
        }

        return {
          applied: Boolean(
            payload &&
              payload.userErrors.length === 0 &&
              operationResult?.applied &&
              operationResult.errors.length === 0,
          ),
          operationResult,
          userErrors,
        };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "An unexpected error occurred";
        return {
          applied: false,
          operationResult: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }],
        };
      }
    },
    [mutate],
  );

  return {
    updateSearchSettings,
    loading,
    error: error ?? null,
    reset,
  };
}
