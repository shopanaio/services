"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { DELETE_ROLE_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiRoleDeleteInput,
  ApiRoleDeletePayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface DeleteRoleResult {
  deletedRoleName: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseDeleteRoleReturn {
  deleteRole: (id: string, organizationId: string) => Promise<DeleteRoleResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for deleting a custom role.
 * System roles cannot be deleted.
 * Roles with assigned users cannot be deleted.
 */
export function useDeleteRole(): UseDeleteRoleReturn {
  const [mutate, { loading, error }] = useMutation<
    { roleMutation: { roleDelete: ApiRoleDeletePayload } },
    { input: ApiRoleDeleteInput }
  >(DELETE_ROLE_MUTATION);

  const deleteRole = useCallback(
    async (id: string, organizationId: string): Promise<DeleteRoleResult> => {
      const result = await mutate({
        variables: { input: { id, organizationId } },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: organizationId } }],
      });
      const payload = result.data?.roleMutation.roleDelete;

      return {
        deletedRoleName: payload?.deletedRoleName ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    deleteRole,
    loading,
    error: error ?? null,
  };
}
