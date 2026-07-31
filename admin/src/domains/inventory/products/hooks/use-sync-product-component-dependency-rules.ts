"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { ProductComponentOperationAction } from "@/graphql/types";
import type {
  ApiGenericUserError,
  ApiProductComponentDependencyRule,
  ApiProductComponentDependencyRuleSyncItemInput,
} from "@/graphql/types";
import {
  PRODUCT_DETAILS_QUERY,
  PRODUCT_UPDATE_MUTATION,
} from "../graphql";
import type {
  ProductUpdateMutationData,
  ProductUpdateMutationVariables,
} from "../graphql/operation-types";

interface SyncProductComponentDependencyRulesResult {
  dependencyRules: ApiProductComponentDependencyRule[];
  userErrors: ApiGenericUserError[];
}

interface SyncProductComponentDependencyRulesInput {
  productId: string;
  configurationId: string;
  expectedRevision: number;
  dependencyRules: ApiProductComponentDependencyRuleSyncItemInput[];
}

export function useSyncProductComponentDependencyRules() {
  const [mutation, { loading, error, reset }] = useMutation<
    ProductUpdateMutationData,
    ProductUpdateMutationVariables
  >(PRODUCT_UPDATE_MUTATION);

  const syncDependencyRules = useCallback(
    async (
      input: SyncProductComponentDependencyRulesInput,
    ): Promise<SyncProductComponentDependencyRulesResult> => {
      try {
        const result = await mutation({
          variables: {
            productId: input.productId,
            expectedRevision: input.expectedRevision,
            operations: {
              components: [
                {
                  action:
                    ProductComponentOperationAction.DependencyRulesSync,
                  configurationId: input.configurationId,
                  dependencyRules: input.dependencyRules,
                },
              ],
            },
          },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.productUpdate;
        const configuration =
          payload?.product?.productComponent?.configurations.find(
            (item) => item.id === input.configurationId,
          );

        return {
          dependencyRules: configuration?.dependencyRules ?? [],
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
