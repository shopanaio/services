"use client";

import { useQuery } from "@apollo/client/react";
import { STORE_QUERY } from "../graphql";
import type { ApiStore } from "@/graphql/types";

interface UseStoreOptions {
  /**
   * Skip the query (useful for conditional fetching).
   */
  skip?: boolean;
}

interface UseStoreReturn {
  /**
   * The store with full details, or null if not found.
   */
  store: ApiStore | null;
  /**
   * Whether the query is loading.
   */
  loading: boolean;
  /**
   * Error from the query, if any.
   */
  error: Error | null;
  /**
   * Refetch the store.
   */
  refetch: () => void;
}

/**
 * Hook for fetching a single store by ID with full details.
 * Includes membership information (members, roles).
 *
 * @example
 * ```tsx
 * const { store, loading } = useStore("store-123", "org-456");
 * ```
 */
export function useStore(
  id: string,
  organizationId: string,
  options: UseStoreOptions = {}
): UseStoreReturn {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    storeQuery: { store: ApiStore | null };
  }>(STORE_QUERY, {
    variables: { id, organizationId },
    skip: skip || !id || !organizationId,
    fetchPolicy: "cache-and-network",
  });

  return {
    store: data?.storeQuery.store ?? null,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
