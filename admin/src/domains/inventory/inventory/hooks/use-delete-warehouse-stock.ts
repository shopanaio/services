"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiWarehouseStockDeleteInput,
} from "@/graphql/types";
import { WAREHOUSE_STOCK_DELETE_MUTATION } from "../graphql";
import type {
  WarehouseStockDeleteMutationData,
  WarehouseStockDeleteMutationVariables,
} from "../graphql";

interface DeleteWarehouseStockResult {
  deletedWarehouseStockIds: string[];
  userErrors: ApiGenericUserError[];
}

interface UseDeleteWarehouseStockReturn {
  deleteWarehouseStock: (
    input: ApiWarehouseStockDeleteInput,
  ) => Promise<DeleteWarehouseStockResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

function toUnexpectedError(err: unknown): ApiGenericUserError {
  return {
    code: "UNEXPECTED_ERROR",
    message: err instanceof Error ? err.message : "An unexpected error occurred",
  };
}

export function useDeleteWarehouseStock(): UseDeleteWarehouseStockReturn {
  const [deleteWarehouseStockMutation, { loading, error, reset }] = useMutation<
    WarehouseStockDeleteMutationData,
    WarehouseStockDeleteMutationVariables
  >(WAREHOUSE_STOCK_DELETE_MUTATION);

  const deleteWarehouseStock = useCallback(
    async (
      input: ApiWarehouseStockDeleteInput,
    ): Promise<DeleteWarehouseStockResult> => {
      try {
        const result = await deleteWarehouseStockMutation({
          variables: { input },
        });
        const payload =
          result.data?.inventoryMutation.warehouseStockDelete ?? null;

        return {
          deletedWarehouseStockIds: payload?.deletedWarehouseStockIds ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        return {
          deletedWarehouseStockIds: [],
          userErrors: [toUnexpectedError(err)],
        };
      }
    },
    [deleteWarehouseStockMutation],
  );

  return {
    deleteWarehouseStock,
    loading,
    error: error ?? null,
    reset,
  };
}
