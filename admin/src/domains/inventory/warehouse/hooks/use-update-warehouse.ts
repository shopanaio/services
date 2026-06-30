"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiWarehouse,
  ApiWarehouseUpdateInput,
} from "@/graphql/types";
import {
  WAREHOUSES_QUERY,
  WAREHOUSE_DETAILS_QUERY,
  WAREHOUSE_UPDATE_MUTATION,
} from "../graphql";
import type {
  WarehouseDetailsQueryVariables,
  WarehouseUpdateMutationData,
  WarehouseUpdateMutationVariables,
  WarehousesQueryVariables,
} from "../graphql";

interface UpdateWarehouseResult {
  warehouse: ApiWarehouse | null;
  userErrors: ApiGenericUserError[];
}

export interface UpdateWarehouseOptions {
  listQueryVariables?: WarehousesQueryVariables;
  detailsQueryVariables?: WarehouseDetailsQueryVariables;
  onCompleted?: (warehouse: ApiWarehouse) => void | Promise<void>;
}

interface UseUpdateWarehouseReturn {
  updateWarehouse: (
    input: ApiWarehouseUpdateInput,
    options?: UpdateWarehouseOptions,
  ) => Promise<UpdateWarehouseResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateWarehouse(): UseUpdateWarehouseReturn {
  const [updateWarehouseMutation, { loading, error, reset }] = useMutation<
    WarehouseUpdateMutationData,
    WarehouseUpdateMutationVariables
  >(WAREHOUSE_UPDATE_MUTATION);

  const updateWarehouse = useCallback(
    async (
      input: ApiWarehouseUpdateInput,
      options: UpdateWarehouseOptions = {},
    ): Promise<UpdateWarehouseResult> => {
      try {
        const refetchQueries = [
          ...(options.listQueryVariables
            ? [
                {
                  query: WAREHOUSES_QUERY,
                  variables: options.listQueryVariables,
                },
              ]
            : []),
          ...(options.detailsQueryVariables
            ? [
                {
                  query: WAREHOUSE_DETAILS_QUERY,
                  variables: options.detailsQueryVariables,
                },
              ]
            : []),
        ];

        const result = await updateWarehouseMutation({
          variables: { input },
          refetchQueries:
            refetchQueries.length > 0 ? refetchQueries : undefined,
          awaitRefetchQueries: refetchQueries.length > 0,
        });

        const payload = result.data?.inventoryMutation.warehouseUpdate;

        if (payload?.userErrors && payload.userErrors.length > 0) {
          return {
            warehouse: null,
            userErrors: payload.userErrors,
          };
        }

        const warehouse = payload?.warehouse ?? null;
        if (warehouse) {
          await options.onCompleted?.(warehouse);
        }

        return {
          warehouse,
          userErrors: [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          warehouse: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [updateWarehouseMutation],
  );

  return {
    updateWarehouse,
    loading,
    error: error ?? null,
    reset,
  };
}
