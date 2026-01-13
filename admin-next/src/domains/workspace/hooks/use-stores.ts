"use client";

import { useQuery } from "@apollo/client/react";
import { STORES_QUERY } from "../graphql";
import type { ApiStore } from "@/graphql/types";

interface UseStoresOptions {
  /**
   * Organization ID to fetch stores from.
   */
  organizationId: string;
  /**
   * Skip the query (useful for conditional fetching).
   */
  skip?: boolean;
}

interface UseStoresReturn {
  /**
   * List of stores in the organization.
   */
  stores: ApiStore[];
  /**
   * Whether the query is loading.
   */
  loading: boolean;
  /**
   * Error from the query, if any.
   */
  error: Error | null;
  /**
   * Refetch the stores list.
   */
  refetch: () => void;
}

/**
 * Hook for fetching all stores in an organization.
 * Returns stores the current user has access to.
 *
 * @example
 * ```tsx
 * const { stores, loading } = useStores({ organizationId: "org-123" });
 * ```
 */
export function useStores(options: UseStoresOptions): UseStoresReturn {
  const { organizationId, skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    storeQuery: { stores: ApiStore[] };
  }>(STORES_QUERY, {
    variables: { organizationId },
    skip: skip || !organizationId,
    fetchPolicy: "cache-and-network",
  });

  return {
    stores: data?.storeQuery.stores ?? [],
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
