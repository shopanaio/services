"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { ProductComponentOperationAction } from "@/graphql/types";
import type {
  ApiGenericUserError,
  ApiProductComponent,
  ApiProductComponentConfiguration,
} from "@/graphql/types";
import {
  PRODUCT_DETAILS_QUERY,
  PRODUCT_UPDATE_MUTATION,
} from "../graphql";
import type {
  ProductUpdateMutationData,
  ProductUpdateMutationVariables,
} from "../graphql/operation-types";

interface ProductComponentConfigurationMutationResult {
  productComponent: ApiProductComponent | null;
  configuration: ApiProductComponentConfiguration | null;
  deletedConfigurationId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseProductComponentConfigurationsReturn {
  createConfiguration: (input: {
    productId: string;
    expectedRevision: number;
    name: string;
  }) => Promise<ProductComponentConfigurationMutationResult>;
  updateConfiguration: (input: {
    productId: string;
    id: string;
    expectedRevision: number;
    name: string;
  }) => Promise<ProductComponentConfigurationMutationResult>;
  deleteConfiguration: (input: {
    productId: string;
    id: string;
    expectedRevision: number;
  }) => Promise<ProductComponentConfigurationMutationResult>;
  loading: boolean;
  error: Error | null;
}

const EMPTY_RESULT: ProductComponentConfigurationMutationResult = {
  productComponent: null,
  configuration: null,
  deletedConfigurationId: null,
  userErrors: [],
};

function unexpectedResult(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return {
    ...EMPTY_RESULT,
    userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
  };
}

export function useProductComponentConfigurations(): UseProductComponentConfigurationsReturn {
  const [mutation, mutationState] = useMutation<
    ProductUpdateMutationData,
    ProductUpdateMutationVariables
  >(PRODUCT_UPDATE_MUTATION);

  const createConfiguration = useCallback(
    async (input: {
      productId: string;
      expectedRevision: number;
      name: string;
    }) => {
      try {
        const clientMutationId = crypto.randomUUID();
        const result = await mutation({
          variables: {
            productId: input.productId,
            expectedRevision: input.expectedRevision,
            operations: {
              components: [
                {
                  action:
                    ProductComponentOperationAction.ConfigurationCreate,
                  clientMutationId,
                  name: input.name,
                },
              ],
            },
          },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.productUpdate;
        const configurationId = payload?.operationResults.find(
          (operation) => operation.clientMutationId === clientMutationId,
        )?.entityId;
        const productComponent = payload?.product?.productComponent ?? null;

        return {
          productComponent,
          configuration:
            productComponent?.configurations.find(
              (configuration) => configuration.id === configurationId,
            ) ?? null,
          deletedConfigurationId: null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return unexpectedResult(error);
      }
    },
    [mutation],
  );

  const updateConfiguration = useCallback(
    async (input: {
      productId: string;
      id: string;
      expectedRevision: number;
      name: string;
    }) => {
      try {
        const result = await mutation({
          variables: {
            productId: input.productId,
            expectedRevision: input.expectedRevision,
            operations: {
              components: [
                {
                  action:
                    ProductComponentOperationAction.ConfigurationUpdate,
                  configurationId: input.id,
                  name: input.name,
                },
              ],
            },
          },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.productUpdate;
        const productComponent = payload?.product?.productComponent ?? null;

        return {
          productComponent,
          configuration:
            productComponent?.configurations.find(
              (configuration) => configuration.id === input.id,
            ) ?? null,
          deletedConfigurationId: null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return unexpectedResult(error);
      }
    },
    [mutation],
  );

  const deleteConfiguration = useCallback(
    async (input: {
      productId: string;
      id: string;
      expectedRevision: number;
    }) => {
      try {
        const result = await mutation({
          variables: {
            productId: input.productId,
            expectedRevision: input.expectedRevision,
            operations: {
              components: [
                {
                  action:
                    ProductComponentOperationAction.ConfigurationDelete,
                  configurationId: input.id,
                },
              ],
            },
          },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.productUpdate;

        return {
          productComponent: payload?.product?.productComponent ?? null,
          configuration: null,
          deletedConfigurationId:
            payload && payload.userErrors.length === 0 ? input.id : null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return unexpectedResult(error);
      }
    },
    [mutation],
  );

  return {
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    loading: mutationState.loading,
    error: mutationState.error ?? null,
  };
}
