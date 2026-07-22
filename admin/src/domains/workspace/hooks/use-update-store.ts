"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_STORE_MUTATION } from "../graphql";
import type {
  ApiStoreUpdateInput,
  ApiStoreUpdateOperationResult,
  ApiStore,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateStoreResult {
  /**
   * The updated store, or null if update failed.
   */
  store: ApiStore | null;
  /**
   * List of validation/business logic errors.
   */
  userErrors: ApiGenericUserError[];
  /** Result of each requested store update operation. */
  operationResults: ApiStoreUpdateOperationResult[];
}

interface UseUpdateStoreReturn {
  /**
   * Function to update a store.
   */
  updateStore: (
    storeId: string,
    expectedRevision: number,
    operations: ApiStoreUpdateInput,
    clientMutationId?: string,
  ) => Promise<UpdateStoreResult>;
  /**
   * Whether the mutation is in progress.
   */
  loading: boolean;
  /**
   * GraphQL/network error, if any.
   */
  error: Error | null;
}

/**
 * Hook for updating store settings.
 * The cache is automatically updated with the new store data.
 *
 * @example
 * ```tsx
 * const { updateStore, loading } = useUpdateStore();
 *
 * const handleUpdate = async () => {
 *   const { store, userErrors } = await updateStore("store-123", 0, {
 *     contactDetails: {
 *       name: "Updated Store Name",
 *       slug: "my-store",
 *       phoneNumbers: [],
 *     },
 *   });
 *
 *   if (userErrors.length > 0) {
 *     // Handle validation errors
 *   }
 * };
 * ```
 */
export function useUpdateStore(): UseUpdateStoreReturn {
  const [mutate, { loading, error }] = useMutation<
    {
      storeMutation: {
        storeUpdate: {
          store: ApiStore | null;
          operationResults: ApiStoreUpdateOperationResult[];
          userErrors: ApiGenericUserError[];
        };
      };
    },
    {
      storeId: string;
      clientMutationId: string;
      expectedRevision: number;
      operations: ApiStoreUpdateInput;
    }
  >(UPDATE_STORE_MUTATION);

  const updateStore = useCallback(
    async (
      storeId: string,
      expectedRevision: number,
      operations: ApiStoreUpdateInput,
      clientMutationId = crypto.randomUUID(),
    ): Promise<UpdateStoreResult> => {
      const result = await mutate({
        variables: {
          storeId,
          clientMutationId,
          expectedRevision,
          operations,
        },
      });
      const payload = result.data?.storeMutation.storeUpdate;

      return {
        store: payload?.store ?? null,
        operationResults: payload?.operationResults ?? [],
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateStore,
    loading,
    error: error ?? null,
  };
}
