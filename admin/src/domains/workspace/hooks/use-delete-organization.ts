"use client";

import { useMutation, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import { DELETE_ORGANIZATION_MUTATION } from "../graphql";
import type {
  ApiOrganizationDeletePayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface DeleteOrganizationResult {
  deletedOrganizationId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseDeleteOrganizationReturn {
  deleteOrganization: (id: string) => Promise<DeleteOrganizationResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for deleting an organization.
 * Only the owner can delete the organization.
 * Clears relevant cache entries after deletion.
 */
export function useDeleteOrganization(): UseDeleteOrganizationReturn {
  const client = useApolloClient();
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { organizationDelete: ApiOrganizationDeletePayload } },
    { id: string }
  >(DELETE_ORGANIZATION_MUTATION);

  const deleteOrganization = useCallback(
    async (id: string): Promise<DeleteOrganizationResult> => {
      const result = await mutate({ variables: { id } });
      const payload = result.data?.organizationMutation.organizationDelete;

      // Evict organization from cache on successful deletion
      if (payload?.deletedOrganizationId) {
        client.cache.evict({ id: `Organization:${id}` });
        client.cache.gc();
      }

      return {
        deletedOrganizationId: payload?.deletedOrganizationId ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate, client]
  );

  return {
    deleteOrganization,
    loading,
    error: error ?? null,
  };
}
