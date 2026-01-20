/**
 * IAM service broker action types
 */

// ============================================================================
// Roles Actions
// ============================================================================

export interface Permission {
  resource: string;
  action: "read" | "write" | "admin";
}

export interface RoleConfig {
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
}

export interface CreateRolesParams {
  userId: string;
  organizationId: string;
  domain: string;
  roles: RoleConfig[];
}

export interface CreateRolesResult {
  success: boolean;
  error?: string;
}

export interface AssignRoleParams {
  userId: string;
  organizationId: string;
  domain: string;
  roleName: string;
}

export interface AssignRoleResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Authorization Actions
// ============================================================================

export interface AuthorizeParams {
  subject?: string;
  organizationId: string;
  domain?: string;
  resource: string;
  action: string;
}

export interface AuthorizeResult {
  allowed: boolean;
}

export interface BatchAuthorizeRequest {
  userId: string;
  organizationId: string;
  domain?: string;
  resource: string;
  action: string;
}

export interface BatchAuthorizeParams {
  requests: BatchAuthorizeRequest[];
}

export interface BatchAuthorizeResult {
  results: boolean[];
}

// ============================================================================
// User Actions
// ============================================================================

export interface GetCurrentUserParams {
  accessToken: string;
}

export interface GetCurrentUserResult {
  user: {
    id: string;
    name: string;
    email?: string;
  } | null;
  userErrors: Array<{ code: string; message: string }>;
}
