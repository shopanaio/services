"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_ORGANIZATION_LOGO_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiOrganizationUpdateLogoInput,
  ApiOrganizationUpdateLogoPayload,
  ApiOrganization,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateOrganizationLogoResult {
  organization: ApiOrganization | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateOrganizationLogoReturn {
  updateOrganizationLogo: (input: ApiOrganizationUpdateLogoInput) => Promise<UpdateOrganizationLogoResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating an organization's logo.
 * Pass logoId to set logo, or null to remove it.
 * Requires admin or owner permission.
 */
export function useUpdateOrganizationLogo(): UseUpdateOrganizationLogoReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { organizationUpdateLogo: ApiOrganizationUpdateLogoPayload } },
    { input: ApiOrganizationUpdateLogoInput }
  >(UPDATE_ORGANIZATION_LOGO_MUTATION);

  const updateOrganizationLogo = useCallback(
    async (input: ApiOrganizationUpdateLogoInput): Promise<UpdateOrganizationLogoResult> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: input.id } }],
      });
      const payload = result.data?.organizationMutation.organizationUpdateLogo;

      return {
        organization: payload?.organization ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateOrganizationLogo,
    loading,
    error: error ?? null,
  };
}
