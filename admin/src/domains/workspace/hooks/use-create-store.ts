"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CREATE_STORE_MUTATION, STORES_QUERY } from "../graphql";
import type { ApiStoreCreateInput, ApiStore, ApiGenericUserError } from "@/graphql/types";

type CreatedStore = Pick<
  ApiStore,
  "id" | "revision" | "name" | "displayName" | "status" | "currencyCode" | "createdAt"
>;

interface CreateStoreResult {
  /**
   * The created store, or null if creation failed.
   */
  store: CreatedStore | null;
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
 *     currencyCode: "USD",
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
          store: CreatedStore | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiStoreCreateInput }
  >(CREATE_STORE_MUTATION);

  const createStore = useCallback(
    async (input: ApiStoreCreateInput): Promise<CreateStoreResult> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [
          {
            query: STORES_QUERY,
            variables: { organizationId: input.organizationId },
          },
        ],
        awaitRefetchQueries: true,
      });
      const payload = result.data?.storeMutation.storeCreate;

      return {
        store: payload?.store ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate],
  );

  return {
    createStore,
    loading,
    error: error ?? null,
  };
}
