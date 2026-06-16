"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { REMOVE_MEMBER_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiMemberRemoveInput,
  ApiMemberRemovePayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface RemoveMemberResult {
  removedMemberId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseRemoveMemberReturn {
  removeMember: (organizationId: string, userId: string) => Promise<RemoveMemberResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for removing a member from an organization.
 * Cannot remove the organization owner (transfer ownership first).
 * Automatically refetches organization data after removal.
 */
export function useRemoveMember(): UseRemoveMemberReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { memberRemove: ApiMemberRemovePayload } },
    { input: ApiMemberRemoveInput }
  >(REMOVE_MEMBER_MUTATION);

  const removeMember = useCallback(
    async (organizationId: string, userId: string): Promise<RemoveMemberResult> => {
      const result = await mutate({
        variables: { input: { organizationId, userId } },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: organizationId } }],
      });
      const payload = result.data?.organizationMutation.memberRemove;

      return {
        removedMemberId: payload?.removedMemberId ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    removeMember,
    loading,
    error: error ?? null,
  };
}
