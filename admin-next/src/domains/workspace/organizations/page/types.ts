import type { ApiOrganization } from "@/graphql/types";

/**
 * Extended organization with computed display properties.
 * Derived from ApiOrganization with additional UI-friendly fields.
 */
export interface IOrganization {
  id: string;
  name: string;
  displayName: string;
  createdAt: string;
}

export interface IOrganizationItemProps {
  organization: IOrganization;
  onClick?: () => void;
}

export interface IOrganizationsSectionProps {
  organizations: IOrganization[];
  loading?: boolean;
  onOrganizationClick: (organization: IOrganization) => void;
  onCreateOrganization: () => void;
}

/**
 * Transform API organization to display format.
 */
export function toDisplayOrganization(org: ApiOrganization): IOrganization {
  return {
    id: org.id,
    name: org.name,
    displayName: org.displayName,
    createdAt: org.createdAt ?? "",
  };
}
