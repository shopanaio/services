"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CHANGE_MEMBER_ROLE_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiMemberRoleChangeInput,
  ApiMemberRoleChangePayload,
  ApiMember,
  ApiGenericUserError,
} from "@/graphql/types";

interface ChangeMemberRoleResult {
  member: ApiMember | null;
  userErrors: ApiGenericUserError[];
}

interface UseChangeMemberRoleReturn {
  changeMemberRole: (
    organizationId: string,
    userId: string,
    domain: string,
    role: string
  ) => Promise<ChangeMemberRoleResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for changing a member's role in a specific domain.
 * Owner's role cannot be changed.
 * Domain can be "org" for organization-level or "store:{uuid}" for store-specific.
 */
export function useChangeMemberRole(): UseChangeMemberRoleReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { memberRoleChange: ApiMemberRoleChangePayload } },
    { input: ApiMemberRoleChangeInput }
  >(CHANGE_MEMBER_ROLE_MUTATION);

  const changeMemberRole = useCallback(
    async (
      organizationId: string,
      userId: string,
      domain: string,
      role: string
    ): Promise<ChangeMemberRoleResult> => {
      const result = await mutate({
        variables: { input: { organizationId, userId, domain, role } },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: organizationId } }],
      });
      const payload = result.data?.organizationMutation.memberRoleChange;

      return {
        member: payload?.member ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    changeMemberRole,
    loading,
    error: error ?? null,
  };
}
