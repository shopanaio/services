"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductComponentDependencyRule,
  ApiProductComponentDependencyRulesSyncInput,
} from "@/graphql/types";
import {
  PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC_MUTATION,
  PRODUCT_DETAILS_QUERY,
} from "../graphql";
import type {
  ProductComponentDependencyRulesSyncMutationData,
  ProductComponentDependencyRulesSyncMutationVariables,
} from "../graphql/operation-types";

interface SyncProductComponentDependencyRulesResult {
  dependencyRules: ApiProductComponentDependencyRule[];
  userErrors: ApiGenericUserError[];
}

export function useSyncProductComponentDependencyRules() {
  const [mutation, { loading, error, reset }] = useMutation<
    ProductComponentDependencyRulesSyncMutationData,
    ProductComponentDependencyRulesSyncMutationVariables
  >(PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC_MUTATION);

  const syncDependencyRules = useCallback(
    async (
      input: ApiProductComponentDependencyRulesSyncInput,
    ): Promise<SyncProductComponentDependencyRulesResult> => {
      try {
        const result = await mutation({
          variables: { input },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload =
          result.data?.catalogMutation.productComponentDependencyRulesSync;

        return {
          dependencyRules: payload?.dependencyRules ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (mutationError) {
        return {
          dependencyRules: [],
          userErrors: [
            {
              message:
                mutationError instanceof Error
                  ? mutationError.message
                  : "Unable to save pricing rules",
              code: "UNEXPECTED_ERROR",
            },
          ],
        };
      }
    },
    [mutation],
  );

  return {
    syncDependencyRules,
    loading,
    error: error ?? null,
    reset,
  };
}
