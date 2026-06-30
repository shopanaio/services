"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiWarehouseStock,
  ApiWarehouseStockCreateInput,
} from "@/graphql/types";
import { WAREHOUSE_STOCK_CREATE_MUTATION } from "../graphql";
import type {
  WarehouseStockCreateMutationData,
  WarehouseStockCreateMutationVariables,
} from "../graphql";

interface CreateWarehouseStockResult {
  warehouseStocks: ApiWarehouseStock[];
  userErrors: ApiGenericUserError[];
}

interface UseCreateWarehouseStockReturn {
  createWarehouseStock: (
    input: ApiWarehouseStockCreateInput,
  ) => Promise<CreateWarehouseStockResult>;
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

export function useCreateWarehouseStock(): UseCreateWarehouseStockReturn {
  const [createWarehouseStockMutation, { loading, error, reset }] = useMutation<
    WarehouseStockCreateMutationData,
    WarehouseStockCreateMutationVariables
  >(WAREHOUSE_STOCK_CREATE_MUTATION);

  const createWarehouseStock = useCallback(
    async (
      input: ApiWarehouseStockCreateInput,
    ): Promise<CreateWarehouseStockResult> => {
      try {
        const result = await createWarehouseStockMutation({
          variables: { input },
        });
        const payload =
          result.data?.inventoryMutation.warehouseStockCreate ?? null;

        return {
          warehouseStocks: payload?.warehouseStocks ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        return {
          warehouseStocks: [],
          userErrors: [toUnexpectedError(err)],
        };
      }
    },
    [createWarehouseStockMutation],
  );

  return {
    createWarehouseStock,
    loading,
    error: error ?? null,
    reset,
  };
}
