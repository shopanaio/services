export interface ProvisionTenantParams {
  ownerId: string;
}

export interface ProvisionTenantResult {
  organizationId: string | null;
  roles: string[];
  userErrors: Array<{ code: string; message: string }>;
}
