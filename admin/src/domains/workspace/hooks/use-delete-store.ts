"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { DELETE_STORE_MUTATION, STORES_QUERY } from "../graphql";
import type { ApiStoreDeleteInput, ApiGenericUserError } from "@/graphql/types";

interface DeleteStoreResult {
  /**
   * ID of the deleted store, or null if deletion failed.
   */
  deletedStoreId: string | null;
  /**
   * List of validation/business logic errors.
   */
  userErrors: ApiGenericUserError[];
}

interface UseDeleteStoreReturn {
  /**
   * Function to delete a store.
   */
  deleteStore: (input: ApiStoreDeleteInput) => Promise<DeleteStoreResult>;
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
 * Hook for deleting a store.
 * Automatically refetches the stores list on success.
 *
 * @example
 * ```tsx
 * const { deleteStore, loading } = useDeleteStore();
 *
 * const handleDelete = async () => {
 *   const { deletedStoreId, userErrors } = await deleteStore({
 *     id: "store-123",
 *     organizationId: "org-456",
 *   });
 *
 *   if (userErrors.length > 0) {
 *     // Handle errors (e.g., permission denied)
 *   } else if (deletedStoreId) {
 *     // Store deleted successfully
 *   }
 * };
 * ```
 */
export function useDeleteStore(): UseDeleteStoreReturn {
  const [mutate, { loading, error }] = useMutation<
    {
      storeMutation: {
        storeDelete: {
          deletedStoreId: string | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiStoreDeleteInput }
  >(DELETE_STORE_MUTATION, {
    update: (cache, result, { variables }) => {
      const deletedId = result.data?.storeMutation.storeDelete.deletedStoreId;
      if (!deletedId || !variables?.input.organizationId) return;

      // Remove the deleted store from the cache
      cache.evict({ id: cache.identify({ __typename: "Store", id: deletedId }) });
      cache.gc();
    },
  });

  const deleteStore = useCallback(
    async (input: ApiStoreDeleteInput): Promise<DeleteStoreResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.storeMutation.storeDelete;

      return {
        deletedStoreId: payload?.deletedStoreId ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    deleteStore,
    loading,
    error: error ?? null,
  };
}
