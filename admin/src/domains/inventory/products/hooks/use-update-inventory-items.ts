"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiInventoryItem,
  ApiInventoryItemUpdateInput,
} from "@/graphql/types";
import { INVENTORY_ITEM_UPDATE_MUTATION } from "../graphql";
import type {
  InventoryItemUpdateMutationData,
  InventoryItemUpdateMutationVariables,
} from "../graphql";

interface UpdateInventoryItemsResult {
  inventoryItems: ApiInventoryItem[];
  userErrors: ApiGenericUserError[];
  errors: ApiGenericUserError[];
}

interface UseUpdateInventoryItemsReturn {
  updateInventoryItems: (
    inputs: ApiInventoryItemUpdateInput[],
  ) => Promise<UpdateInventoryItemsResult>;
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

export function useUpdateInventoryItems(): UseUpdateInventoryItemsReturn {
  const [updateInventoryItemMutation, { loading, error, reset }] = useMutation<
    InventoryItemUpdateMutationData,
    InventoryItemUpdateMutationVariables
  >(INVENTORY_ITEM_UPDATE_MUTATION);

  const updateInventoryItems = useCallback(
    async (
      inputs: ApiInventoryItemUpdateInput[],
    ): Promise<UpdateInventoryItemsResult> => {
      if (inputs.length === 0) {
        return {
          inventoryItems: [],
          userErrors: [],
          errors: [],
        };
      }

      const inventoryItems: ApiInventoryItem[] = [];
      const userErrors: ApiGenericUserError[] = [];
      const errors: ApiGenericUserError[] = [];

      for (const input of inputs) {
        try {
          const result = await updateInventoryItemMutation({
            variables: { input },
          });

          const payload = result.data?.inventoryMutation.inventoryItemUpdate;

          if (!payload) {
            const unexpectedError = toUnexpectedError(
              new Error("Inventory item update did not return a payload"),
            );
            errors.push(unexpectedError);
            continue;
          }

          userErrors.push(...payload.userErrors);
          errors.push(...payload.userErrors);

          if (payload.inventoryItem) {
            inventoryItems.push(payload.inventoryItem);
          }
        } catch (err) {
          errors.push(toUnexpectedError(err));
        }
      }

      return {
        inventoryItems,
        userErrors,
        errors,
      };
    },
    [updateInventoryItemMutation],
  );

  return {
    updateInventoryItems,
    loading,
    error: error ?? null,
    reset,
  };
}
