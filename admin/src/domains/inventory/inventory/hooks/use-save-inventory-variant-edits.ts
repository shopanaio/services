"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiBulkUpdateUserError,
  ApiProductBulkUpdateInput,
  BulkUpdateJobStatus,
} from "@/graphql/types";
import { INVENTORY_PRODUCT_BULK_UPDATE_MUTATION } from "../graphql";
import type {
  InventoryProductBulkUpdateMutationData,
  InventoryProductBulkUpdateMutationVariables,
} from "../graphql";

const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key";

export interface SaveInventoryVariantEditsResult {
  jobId: string | null;
  status: BulkUpdateJobStatus | null;
  userErrors: ApiBulkUpdateUserError[];
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSaveInventoryVariantEdits() {
  const [mutate, { loading, error, reset }] = useMutation<
    InventoryProductBulkUpdateMutationData,
    InventoryProductBulkUpdateMutationVariables
  >(INVENTORY_PRODUCT_BULK_UPDATE_MUTATION);

  const saveInventoryVariantEdits = useCallback(
    async (
      input: ApiProductBulkUpdateInput,
    ): Promise<SaveInventoryVariantEditsResult> => {
      const result = await mutate({
        variables: { input },
        context: {
          headers: {
            [IDEMPOTENCY_KEY_HEADER]: createIdempotencyKey(),
          },
        },
      });

      const payload = result.data?.catalogMutation.productBulkUpdate;

      return {
        jobId: payload?.job?.id ?? null,
        status: payload?.job?.status ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate],
  );

  return {
    saveInventoryVariantEdits,
    loading,
    error: error ?? null,
    reset,
  };
}
