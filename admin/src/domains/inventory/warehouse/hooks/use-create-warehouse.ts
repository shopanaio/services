"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiWarehouse } from "@/graphql/types";
import { WAREHOUSES_QUERY, WAREHOUSE_CREATE_MUTATION } from "../graphql";
import type {
  WarehouseCreateMutationData,
  WarehouseCreateMutationVariables,
  WarehousesQueryVariables,
} from "../graphql";
import {
  mapCreateWarehouseFormToInput,
  type CreateWarehouseInput,
} from "../mappers";

export type { CreateWarehouseInput };

interface WarehouseMutationResult {
  warehouse: ApiWarehouse | null;
  userErrors: ApiGenericUserError[];
}

export interface CreateWarehouseOptions {
  listQueryVariables?: WarehousesQueryVariables;
  onCompleted?: (warehouse: ApiWarehouse) => void | Promise<void>;
}

interface UseCreateWarehouseReturn {
  createWarehouse: (
    input: CreateWarehouseInput,
    options?: CreateWarehouseOptions,
  ) => Promise<WarehouseMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateWarehouse(): UseCreateWarehouseReturn {
  const [createWarehouseMutation, { loading, error, reset }] = useMutation<
    WarehouseCreateMutationData,
    WarehouseCreateMutationVariables
  >(WAREHOUSE_CREATE_MUTATION);

  const createWarehouse = useCallback(
    async (
      input: CreateWarehouseInput,
      options: CreateWarehouseOptions = {},
    ): Promise<WarehouseMutationResult> => {
      try {
        const result = await createWarehouseMutation({
          variables: {
            input: mapCreateWarehouseFormToInput(input),
          },
          refetchQueries: options.listQueryVariables
            ? [
                {
                  query: WAREHOUSES_QUERY,
                  variables: options.listQueryVariables,
                },
              ]
            : undefined,
          awaitRefetchQueries: Boolean(options.listQueryVariables),
        });

        const payload = result.data?.inventoryMutation.warehouseCreate;

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
    [createWarehouseMutation],
  );

  return {
    createWarehouse,
    loading,
    error: error ?? null,
    reset,
  };
}
