"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductComponent,
  ApiProductComponentConfiguration,
} from "@/graphql/types";
import {
  PRODUCT_COMPONENT_CONFIGURATION_CREATE_MUTATION,
  PRODUCT_COMPONENT_CONFIGURATION_DELETE_MUTATION,
  PRODUCT_COMPONENT_CONFIGURATION_UPDATE_MUTATION,
  PRODUCT_DETAILS_QUERY,
} from "../graphql";
import type {
  ProductComponentConfigurationCreateMutationData,
  ProductComponentConfigurationCreateMutationVariables,
  ProductComponentConfigurationDeleteMutationData,
  ProductComponentConfigurationDeleteMutationVariables,
  ProductComponentConfigurationUpdateMutationData,
  ProductComponentConfigurationUpdateMutationVariables,
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
    id: string;
    expectedRevision: number;
    name: string;
  }) => Promise<ProductComponentConfigurationMutationResult>;
  deleteConfiguration: (input: {
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
  const [createMutation, createState] = useMutation<
    ProductComponentConfigurationCreateMutationData,
    ProductComponentConfigurationCreateMutationVariables
  >(PRODUCT_COMPONENT_CONFIGURATION_CREATE_MUTATION);
  const [updateMutation, updateState] = useMutation<
    ProductComponentConfigurationUpdateMutationData,
    ProductComponentConfigurationUpdateMutationVariables
  >(PRODUCT_COMPONENT_CONFIGURATION_UPDATE_MUTATION);
  const [deleteMutation, deleteState] = useMutation<
    ProductComponentConfigurationDeleteMutationData,
    ProductComponentConfigurationDeleteMutationVariables
  >(PRODUCT_COMPONENT_CONFIGURATION_DELETE_MUTATION);

  const createConfiguration = useCallback(
    async (input: {
      productId: string;
      expectedRevision: number;
      name: string;
    }) => {
      try {
        const result = await createMutation({
          variables: { input },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload =
          result.data?.catalogMutation.productComponentConfigurationCreate;

        return {
          productComponent: payload?.productComponent ?? null,
          configuration: payload?.configuration ?? null,
          deletedConfigurationId: null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return unexpectedResult(error);
      }
    },
    [createMutation],
  );

  const updateConfiguration = useCallback(
    async (input: {
      id: string;
      expectedRevision: number;
      name: string;
    }) => {
      try {
        const result = await updateMutation({
          variables: { input },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload =
          result.data?.catalogMutation.productComponentConfigurationUpdate;

        return {
          productComponent: payload?.productComponent ?? null,
          configuration: payload?.configuration ?? null,
          deletedConfigurationId: null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return unexpectedResult(error);
      }
    },
    [updateMutation],
  );

  const deleteConfiguration = useCallback(
    async (input: { id: string; expectedRevision: number }) => {
      try {
        const result = await deleteMutation({
          variables: { input },
          refetchQueries: [PRODUCT_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload =
          result.data?.catalogMutation.productComponentConfigurationDelete;

        return {
          productComponent: payload?.productComponent ?? null,
          configuration: null,
          deletedConfigurationId: payload?.deletedConfigurationId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return unexpectedResult(error);
      }
    },
    [deleteMutation],
  );

  return {
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    loading:
      createState.loading || updateState.loading || deleteState.loading,
    error:
      createState.error ?? updateState.error ?? deleteState.error ?? null,
  };
}
