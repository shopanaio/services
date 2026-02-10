"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CREATE_STORE_MUTATION, STORES_QUERY } from "../graphql";
import type {
  ApiStoreCreateInput,
  ApiStore,
  ApiGenericUserError,
} from "@/graphql/types";

interface CreateStoreResult {
  /**
   * The created store, or null if creation failed.
   */
  store: ApiStore | null;
  /**
   * List of validation/business logic errors.
   */
  userErrors: ApiGenericUserError[];
}

interface UseCreateStoreReturn {
  /**
   * Function to create a new store.
   */
  createStore: (input: ApiStoreCreateInput) => Promise<CreateStoreResult>;
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
 * Hook for creating a new store within an organization.
 * Automatically refetches the stores list on success.
 *
 * @example
 * ```tsx
 * const { createStore, loading } = useCreateStore();
 *
 * const handleCreate = async () => {
 *   const { store, userErrors } = await createStore({
 *     organizationId: "org-123",
 *     name: "my-store",
 *     displayName: "My Store",
 *     locales: ["en"],
 *     currencies: ["USD"],
 *     defaultCurrency: "USD",
 *   });
 *
 *   if (userErrors.length > 0) {
 *     // Handle validation errors
 *   } else if (store) {
 *     // Store created successfully
 *   }
 * };
 * ```
 */
export function useCreateStore(): UseCreateStoreReturn {
  const [mutate, { loading, error }] = useMutation<
    {
      storeMutation: {
        storeCreate: {
          store: ApiStore | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiStoreCreateInput }
  >(CREATE_STORE_MUTATION, {
    refetchQueries: (result) => {
      const organizationId =
        result.data?.storeMutation.storeCreate.store?.organization?.id;
      if (organizationId) {
        return [{ query: STORES_QUERY, variables: { organizationId } }];
      }
      return [];
    },
  });

  const createStore = useCallback(
    async (input: ApiStoreCreateInput): Promise<CreateStoreResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.storeMutation.storeCreate;

      return {
        store: payload?.store ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    createStore,
    loading,
    error: error ?? null,
  };
}
