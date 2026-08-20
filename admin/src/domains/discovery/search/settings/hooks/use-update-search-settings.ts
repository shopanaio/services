"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiSearchSettings,
  ApiSearchSettingsOperationResult,
  ApiSearchSettingsOperationsInput,
} from "@/graphql/types";
import { SearchSettingsOperationType } from "@/graphql/types";
import {
  SEARCH_SETTINGS_UPDATE_MUTATION,
  type SearchSettingsUpdateMutationData,
  type SearchSettingsUpdateMutationVariables,
} from "../graphql";

export interface SearchSettingsUpdateResult {
  applied: boolean;
  settings: ApiSearchSettings | null;
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
          payload?.operationResults.find(
            (item) => item.type === SearchSettingsOperationType.SettingsUpdate,
          ) ?? null;
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

        const applied = Boolean(
          payload?.settings &&
          payload.userErrors.length === 0 &&
          operationResult?.applied === true &&
          operationResult.errors.length === 0,
        );

        if (!applied && userErrors.length === 0) {
          userErrors.push({
            code: "SEARCH_SETTINGS_NOT_APPLIED",
            message: "Search settings were not applied.",
          });
        }

        return {
          applied,
          settings: applied ? (payload?.settings ?? null) : null,
          operationResult,
          userErrors,
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "An unexpected error occurred";
        return {
          applied: false,
          settings: null,
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
