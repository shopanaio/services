"use client";

import { useFragment } from "@apollo/client/react";
import { useMemo } from "react";
import type { ApiMember, ApiOrganization, ApiStore } from "@/graphql/types";
import { useSession } from "@/domains/auth";
import { usePathParams } from "@/registry";
import { ORGANIZATION_FRAGMENT, STORE_FRAGMENT } from "../graphql";

export interface WorkspaceValue {
  organization: ApiOrganization | null;
  currentStore: ApiStore | null;
  store: ApiStore | null;
  organizationLoading: boolean;
  currentMember: ApiMember | null;
  isOwner: boolean;
  currentRole: string | null;
}

export function useWorkspace(): WorkspaceValue {
  const { user } = useSession();
  const pathParams = usePathParams();
  const organizationName = pathParams.getParam("orgName");
  const storeName = pathParams.getParam("storeName");

  const organizationFragment = useFragment<ApiOrganization>({
    fragment: ORGANIZATION_FRAGMENT,
    fragmentName: "OrganizationFields",
    from: organizationName
      ? { __typename: "Organization", name: organizationName }
      : null,
  });

  const currentStoreFragment = useFragment<ApiStore>({
    fragment: STORE_FRAGMENT,
    fragmentName: "StoreFields",
    from: storeName ? { __typename: "Store", name: storeName } : null,
  });

  const organization = organizationFragment.complete
    ? (organizationFragment.data as ApiOrganization)
    : null;

  const currentStore = currentStoreFragment.complete
    ? (currentStoreFragment.data as ApiStore)
    : null;

  const currentMember = useMemo(() => {
    if (!organization?.membership?.members || !user?.id) return null;

    return (
      organization.membership.members.find(
        (member) => member?.user?.id === user.id
      ) ??
      null
    );
  }, [organization?.membership?.members, user?.id]);

  return {
    organization,
    currentStore,
    store: currentStore,
    organizationLoading:
      Boolean(organizationName) && !organizationFragment.complete,
    currentMember,
    isOwner: currentMember?.isOwner ?? false,
    currentRole: currentMember?.role ?? null,
  };
}
