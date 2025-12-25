/**
 * Role - defines permissions that can be assigned to users
 */
export interface Role {
  id: string;
  organizationId: string;
  domain: string;
  name: string;
  displayName: string | null;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}
