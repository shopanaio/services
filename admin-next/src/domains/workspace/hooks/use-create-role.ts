"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CREATE_ROLE_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiRoleCreateInput,
  ApiRoleCreatePayload,
  ApiRole,
  ApiRolePermissionInput,
  ApiGenericUserError,
} from "@/graphql/types";

interface CreateRoleResult {
  role: ApiRole | null;
  userErrors: ApiGenericUserError[];
}

interface CreateRoleInput {
  organizationId: string;
  domain: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: ApiRolePermissionInput[];
}

interface UseCreateRoleReturn {
  createRole: (input: CreateRoleInput) => Promise<CreateRoleResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for creating a new custom role.
 * Requires admin permission.
 * Domain can be "org" for organization-level or "store:{uuid}" for store-specific.
 */
export function useCreateRole(): UseCreateRoleReturn {
  const [mutate, { loading, error }] = useMutation<
    { roleMutation: { roleCreate: ApiRoleCreatePayload } },
    { input: ApiRoleCreateInput }
  >(CREATE_ROLE_MUTATION);

  const createRole = useCallback(
    async (input: CreateRoleInput): Promise<CreateRoleResult> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: input.organizationId } }],
      });
      const payload = result.data?.roleMutation.roleCreate;

      return {
        role: payload?.role ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    createRole,
    loading,
    error: error ?? null,
  };
}
