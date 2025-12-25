/**
 * UserRole - assignment of a role to a user
 */
export interface UserRole {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  domain: string;
  grantedBy: string | null;
  grantedAt: Date;
}
