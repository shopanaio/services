import type { ApiOrganization } from "@/graphql/types";

export interface OrganizationItemProps {
  organization: ApiOrganization;
  onClick?: () => void;
}

export interface OrganizationsSectionProps {
  organizations: ApiOrganization[];
  loading?: boolean;
  onOrganizationClick: (organization: ApiOrganization) => void;
  onCreateOrganization: () => void;
}
