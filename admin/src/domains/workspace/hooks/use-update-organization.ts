"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_ORGANIZATION_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiOrganizationUpdateInput,
  ApiOrganizationUpdatePayload,
  ApiOrganization,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateOrganizationResult {
  organization: ApiOrganization | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateOrganizationReturn {
  updateOrganization: (input: ApiOrganizationUpdateInput) => Promise<UpdateOrganizationResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating an existing organization.
 * Can update name and displayName.
 * Requires admin or owner permission.
 */
export function useUpdateOrganization(): UseUpdateOrganizationReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { organizationUpdate: ApiOrganizationUpdatePayload } },
    { input: ApiOrganizationUpdateInput }
  >(UPDATE_ORGANIZATION_MUTATION);

  const updateOrganization = useCallback(
    async (input: ApiOrganizationUpdateInput): Promise<UpdateOrganizationResult> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: input.id } }],
      });
      const payload = result.data?.organizationMutation.organizationUpdate;

      return {
        organization: payload?.organization ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateOrganization,
    loading,
    error: error ?? null,
  };
}
