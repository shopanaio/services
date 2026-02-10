"use client";

import { useQuery } from "@apollo/client/react";
import { CURRENT_STORE_QUERY } from "../graphql";
import type { ApiStore } from "@/graphql/types";

interface UseCurrentStoreOptions {
  /**
   * Skip the query (useful for conditional fetching).
   */
  skip?: boolean;
}

interface UseCurrentStoreReturn {
  /**
   * The current store from context, or null if not set.
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
   * Refetch the current store.
   */
  refetch: () => void;
}

/**
 * Hook for fetching the current store from context.
 * The current store is set via request headers (typically from cookies/localStorage).
 * Returns full store details including membership.
 *
 * @example
 * ```tsx
 * const { store, loading } = useCurrentStore();
 * if (store) {
 *   console.log(`Current store: ${store.displayName}`);
 * }
 * ```
 */
export function useCurrentStore(
  options: UseCurrentStoreOptions = {}
): UseCurrentStoreReturn {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    storeQuery: { currentStore: ApiStore | null };
  }>(CURRENT_STORE_QUERY, {
    skip,
    fetchPolicy: "cache-and-network",
  });

  return {
    store: data?.storeQuery.currentStore ?? null,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
