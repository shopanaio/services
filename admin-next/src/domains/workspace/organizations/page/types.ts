export interface IOrganization {
  id: string;
  name: string;
  displayName: string;
  status: "active" | "inactive";
  color: string;
  storesCount: number;
  membersCount: number;
}

export interface IOrganizationItemProps {
  organization: IOrganization;
  onClick?: () => void;
}

export interface IOrganizationsSectionProps {
  organizations: IOrganization[];
  onOrganizationClick: (organization: IOrganization) => void;
  onCreateOrganization: () => void;
}
