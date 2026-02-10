"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_STORE_MUTATION } from "../graphql";
import type {
  ApiStoreUpdateInput,
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
}

interface UseUpdateStoreReturn {
  /**
   * Function to update a store.
   */
  updateStore: (input: ApiStoreUpdateInput) => Promise<UpdateStoreResult>;
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
 *   const { store, userErrors } = await updateStore({
 *     id: "store-123",
 *     organizationId: "org-456",
 *     displayName: "Updated Store Name",
 *     timezone: "America/New_York",
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
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiStoreUpdateInput }
  >(UPDATE_STORE_MUTATION);

  const updateStore = useCallback(
    async (input: ApiStoreUpdateInput): Promise<UpdateStoreResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.storeMutation.storeUpdate;

      return {
        store: payload?.store ?? null,
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
