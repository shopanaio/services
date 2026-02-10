"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { REMOVE_MEMBER_ACCESS_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiMemberAccessRemoveInput,
  ApiMemberAccessRemovePayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface RemoveMemberAccessResult {
  success: boolean;
  userErrors: ApiGenericUserError[];
}

interface UseRemoveMemberAccessReturn {
  removeMemberAccess: (
    organizationId: string,
    userId: string,
    domain: string
  ) => Promise<RemoveMemberAccessResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for removing a member's access from a specific domain.
 * Unlike removeMember, this only removes access from a specific domain (e.g., a store).
 * The member retains access to other domains within the organization.
 */
export function useRemoveMemberAccess(): UseRemoveMemberAccessReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { memberAccessRemove: ApiMemberAccessRemovePayload } },
    { input: ApiMemberAccessRemoveInput }
  >(REMOVE_MEMBER_ACCESS_MUTATION);

  const removeMemberAccess = useCallback(
    async (
      organizationId: string,
      userId: string,
      domain: string
    ): Promise<RemoveMemberAccessResult> => {
      const result = await mutate({
        variables: { input: { organizationId, userId, domain } },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: organizationId } }],
      });
      const payload = result.data?.organizationMutation.memberAccessRemove;

      return {
        success: payload?.success ?? false,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    removeMemberAccess,
    loading,
    error: error ?? null,
  };
}
