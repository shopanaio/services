/**
 * OrganizationMember - links users to organizations
 */
export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  invitedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
