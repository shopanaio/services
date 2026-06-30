"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiWarehouseDeleteInput,
} from "@/graphql/types";
import { WAREHOUSES_QUERY, WAREHOUSE_DELETE_MUTATION } from "../graphql";
import type {
  WarehouseDeleteMutationData,
  WarehouseDeleteMutationVariables,
  WarehousesQueryVariables,
} from "../graphql";

interface DeleteWarehouseResult {
  deletedWarehouseId: string | null;
  userErrors: ApiGenericUserError[];
}

export interface DeleteWarehouseOptions {
  listQueryVariables?: WarehousesQueryVariables;
  onCompleted?: (deletedWarehouseId: string) => void | Promise<void>;
}

interface UseDeleteWarehouseReturn {
  deleteWarehouse: (
    input: ApiWarehouseDeleteInput,
    options?: DeleteWarehouseOptions,
  ) => Promise<DeleteWarehouseResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteWarehouse(): UseDeleteWarehouseReturn {
  const [deleteWarehouseMutation, { loading, error, reset }] = useMutation<
    WarehouseDeleteMutationData,
    WarehouseDeleteMutationVariables
  >(WAREHOUSE_DELETE_MUTATION);

  const deleteWarehouse = useCallback(
    async (
      input: ApiWarehouseDeleteInput,
      options: DeleteWarehouseOptions = {},
    ): Promise<DeleteWarehouseResult> => {
      try {
        const result = await deleteWarehouseMutation({
          variables: { input },
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

        const payload = result.data?.inventoryMutation.warehouseDelete;

        if (payload?.userErrors && payload.userErrors.length > 0) {
          return {
            deletedWarehouseId: null,
            userErrors: payload.userErrors,
          };
        }

        const deletedWarehouseId = payload?.deletedWarehouseId ?? null;
        if (deletedWarehouseId) {
          await options.onCompleted?.(deletedWarehouseId);
        }

        return {
          deletedWarehouseId,
          userErrors: [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          deletedWarehouseId: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [deleteWarehouseMutation],
  );

  return {
    deleteWarehouse,
    loading,
    error: error ?? null,
    reset,
  };
}
