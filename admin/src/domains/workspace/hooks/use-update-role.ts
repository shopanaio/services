"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_ROLE_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiRoleUpdateInput,
  ApiRoleUpdatePayload,
  ApiRole,
  ApiRolePermissionInput,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateRoleResult {
  role: ApiRole | null;
  userErrors: ApiGenericUserError[];
}

interface UpdateRoleInput {
  id: string;
  organizationId: string;
  displayName?: string;
  description?: string;
  permissions?: ApiRolePermissionInput[];
}

interface UseUpdateRoleReturn {
  updateRole: (input: UpdateRoleInput) => Promise<UpdateRoleResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating an existing role.
 * System roles cannot be modified.
 * Permissions are replaced entirely (not merged).
 */
export function useUpdateRole(): UseUpdateRoleReturn {
  const [mutate, { loading, error }] = useMutation<
    { roleMutation: { roleUpdate: ApiRoleUpdatePayload } },
    { input: ApiRoleUpdateInput }
  >(UPDATE_ROLE_MUTATION);

  const updateRole = useCallback(
    async (input: UpdateRoleInput): Promise<UpdateRoleResult> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: input.organizationId } }],
      });
      const payload = result.data?.roleMutation.roleUpdate;

      return {
        role: payload?.role ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateRole,
    loading,
    error: error ?? null,
  };
}
