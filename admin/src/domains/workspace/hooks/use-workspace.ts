"use client";

import { gql } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { useMemo } from "react";
import type { ApiMember, ApiOrganization, ApiStore } from "@/graphql/types";
import { useSession } from "@/domains/auth";
import { ORGANIZATION_FRAGMENT, STORE_FRAGMENT } from "../graphql";

export interface WorkspaceValue {
  organization: ApiOrganization | null;
  store: ApiStore | null;
  organizationLoading: boolean;
  currentMember: ApiMember | null;
  isOwner: boolean;
  currentRole: string | null;
}

type WorkspaceCacheData = {
  organizationQuery?: {
    organization?: ApiOrganization | null;
  } | null;
};

type WorkspaceCurrentStoreCacheData = {
  storeQuery?: {
    currentStore?: ApiStore | null;
  } | null;
};

interface UseWorkspaceOptions {
  organizationName?: string;
}

const WORKSPACE_ORGANIZATION_CACHE_FRAGMENT = gql`
  fragment WorkspaceOrganizationCacheFields on Query {
    organizationQuery {
      organization(name: $organizationName) {
        ...OrganizationFields
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

const WORKSPACE_CURRENT_STORE_CACHE_FRAGMENT = gql`
  fragment WorkspaceCurrentStoreCacheFields on Query {
    storeQuery {
      currentStore {
        ...StoreFields
      }
    }
  }
  ${STORE_FRAGMENT}
`;

export function useWorkspace(options: UseWorkspaceOptions = {}): WorkspaceValue {
  const { user } = useSession();
  const { organizationName } = options;

  const organizationFragment = useFragment<WorkspaceCacheData>({
    fragment: WORKSPACE_ORGANIZATION_CACHE_FRAGMENT,
    fragmentName: "WorkspaceOrganizationCacheFields",
    from: "ROOT_QUERY",
    variables: { organizationName },
  });

  const currentStoreFragment = useFragment<WorkspaceCurrentStoreCacheData>({
    fragment: WORKSPACE_CURRENT_STORE_CACHE_FRAGMENT,
    fragmentName: "WorkspaceCurrentStoreCacheFields",
    from: "ROOT_QUERY",
  });

  const organization = organizationFragment.complete
    ? ((organizationFragment.data.organizationQuery?.organization ??
        null) as ApiOrganization | null)
    : null;

  const currentStore = currentStoreFragment.complete
    ? ((currentStoreFragment.data.storeQuery?.currentStore ??
        null) as ApiStore | null)
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
    store: currentStore,
    organizationLoading:
      Boolean(organizationName) && !organizationFragment.complete,
    currentMember,
    isOwner: currentMember?.isOwner ?? false,
    currentRole: currentMember?.role ?? null,
  };
}
