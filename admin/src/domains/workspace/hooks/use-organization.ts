"use client";

import { useQuery } from "@apollo/client/react";
import { ORGANIZATION_QUERY } from "../graphql";
import type { ApiOrganization } from "@/graphql/types";

interface UseOrganizationOptions {
  skip?: boolean;
}

interface UseOrganizationReturn {
  organization: ApiOrganization | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching a single organization with full membership details.
 * Includes all members, roles, and available resources.
 *
 * @param name - The organization name (URL-friendly identifier) to fetch
 * @param options - Optional configuration
 */
export function useOrganization(
  name: string,
  options: UseOrganizationOptions = {}
): UseOrganizationReturn {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    organizationQuery: { organization: ApiOrganization | null };
  }>(ORGANIZATION_QUERY, {
    variables: { name },
    skip: skip || !name,
    fetchPolicy: "cache-and-network",
  });

  return {
    organization: data?.organizationQuery.organization ?? null,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
