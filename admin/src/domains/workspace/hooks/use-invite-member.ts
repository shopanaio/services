"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { INVITE_MEMBER_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiMemberInviteInput,
  ApiMemberInvitePayload,
  ApiMember,
  ApiRoleAssignment,
  ApiGenericUserError,
} from "@/graphql/types";

interface InviteMemberResult {
  member: ApiMember | null;
  userErrors: ApiGenericUserError[];
}

interface UseInviteMemberReturn {
  inviteMember: (
    organizationId: string,
    email: string,
    roles: ApiRoleAssignment[]
  ) => Promise<InviteMemberResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for inviting a new member to an organization.
 * Sends an invitation email to the specified address.
 * Automatically refetches organization data after invitation.
 */
export function useInviteMember(): UseInviteMemberReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { memberInvite: ApiMemberInvitePayload } },
    { input: ApiMemberInviteInput }
  >(INVITE_MEMBER_MUTATION);

  const inviteMember = useCallback(
    async (
      organizationId: string,
      email: string,
      roles: ApiRoleAssignment[]
    ): Promise<InviteMemberResult> => {
      const result = await mutate({
        variables: {
          input: {
            organizationId,
            email: email as any,
            roles,
          },
        },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: organizationId } }],
      });
      const payload = result.data?.organizationMutation.memberInvite;

      return {
        member: payload?.member ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    inviteMember,
    loading,
    error: error ?? null,
  };
}
