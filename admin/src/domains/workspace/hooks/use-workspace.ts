"use client";

import { useFragment } from "@apollo/client/react";
import { useMemo } from "react";
import type { ApiMember, ApiOrganization } from "@/graphql/types";
import { useSession } from "@/domains/auth";
import { usePathParams } from "@/registry";
import { ORGANIZATION_FRAGMENT } from "../graphql";

export interface WorkspaceValue {
  organization: ApiOrganization | null;
  member: ApiMember | null;
  isOwner: boolean;
  role: string | null;
}

export function useWorkspace(): WorkspaceValue {
  const { user } = useSession();
  const pathParams = usePathParams();
  const organizationName = pathParams.getParam("orgName");

  const organizationFragment = useFragment<ApiOrganization>({
    fragment: ORGANIZATION_FRAGMENT,
    fragmentName: "OrganizationFields",
    from: organizationName ? { __typename: "Organization", name: organizationName } : null,
  });

  const organization = organizationFragment.complete
    ? (organizationFragment.data as ApiOrganization)
    : null;

  const member = useMemo(() => {
    if (!organization?.membership?.members || !user?.id) return null;

    return organization.membership.members.find((member) => member?.user?.id === user.id) ?? null;
  }, [organization?.membership?.members, user?.id]);

  return {
    organization,
    member,
    isOwner: member?.isOwner ?? false,
    role: member?.role ?? null,
  };
}
