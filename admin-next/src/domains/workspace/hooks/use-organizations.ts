"use client";

import { useQuery } from "@apollo/client/react";
import { ORGANIZATIONS_QUERY } from "../graphql";
import type { ApiOrganization } from "@/graphql/types";

interface UseOrganizationsOptions {
  /**
   * Skip the query (useful for conditional fetching).
   */
  skip?: boolean;
}

interface UseOrganizationsReturn {
  /**
   * List of organizations the user has access to.
   */
  organizations: ApiOrganization[];
  /**
   * Whether the query is loading.
   */
  loading: boolean;
  /**
   * Error from the query, if any.
   */
  error: Error | null;
  /**
   * Refetch the organizations list.
   */
  refetch: () => void;
}

/**
 * Hook for fetching all organizations the current user has access to.
 * Returns basic organization info suitable for lists and selectors.
 *
 * @example
 * ```tsx
 * const { organizations, loading } = useOrganizations();
 * ```
 */
export function useOrganizations(
  options: UseOrganizationsOptions = {}
): UseOrganizationsReturn {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    organizationQuery: { organizations: ApiOrganization[] };
  }>(ORGANIZATIONS_QUERY, {
    skip,
    fetchPolicy: "cache-and-network",
  });

  return {
    organizations: data?.organizationQuery.organizations ?? [],
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
