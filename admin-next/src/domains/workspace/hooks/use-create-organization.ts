"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CREATE_ORGANIZATION_MUTATION } from "../graphql";
import type {
  ApiOrganizationCreateInput,
  ApiOrganizationCreatePayload,
  ApiOrganization,
  ApiGenericUserError,
} from "@/graphql/types";

interface CreateOrganizationResult {
  organization: ApiOrganization | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateOrganizationReturn {
  createOrganization: (input: ApiOrganizationCreateInput) => Promise<CreateOrganizationResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for creating a new organization.
 * The current user automatically becomes the owner.
 */
export function useCreateOrganization(): UseCreateOrganizationReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { organizationCreate: ApiOrganizationCreatePayload } },
    { input: ApiOrganizationCreateInput }
  >(CREATE_ORGANIZATION_MUTATION);

  const createOrganization = useCallback(
    async (input: ApiOrganizationCreateInput): Promise<CreateOrganizationResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.organizationMutation.organizationCreate;

      return {
        organization: payload?.organization ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    createOrganization,
    loading,
    error: error ?? null,
  };
}
