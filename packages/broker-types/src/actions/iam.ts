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
// Application Actions
// ============================================================================

export interface AllocateApplicationIdParams {}

export interface AllocateApplicationIdResult {
  success: boolean;
  applicationId?: string;
  error?: string;
}

export interface ServiceLinkedOwnerInput {
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
}

export type ResourceManagementInput =
  | { managementMode: "admin" }
  | {
      managementMode: "service_linked";
      linkedOwner: ServiceLinkedOwnerInput;
    };

export type CreateApplicationParams = {
  applicationId: string;
  userId: string;
  organizationId: string;
  name: string;
  displayName: string;
  description?: string;
} & ResourceManagementInput;

export interface CreateApplicationResult {
  success: boolean;
  applicationId?: string;
  error?: string;
}

export interface DeleteApplicationForStoreCreateCompensationParams {
  applicationId: string;
  organizationId: string;
  storeId: string;
}

export interface DeleteApplicationForStoreCreateCompensationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Authorization Actions
// ============================================================================

export interface ProtectedResourceRef {
  organizationId: string;
  resourceKind: string;
  resourceId: string;
}

export interface LinkedOwnerRef extends ProtectedResourceRef {
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
}

export interface ServiceLinkedAuthorizationDetails extends LinkedOwnerRef {}

export interface AuthorizeParams {
  subject?: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  resource: string;
  action: string;
  protectedResource?: ProtectedResourceRef;
}

export type AuthorizeDeniedCode = "RESOURCE_SERVICE_LINKED";

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  deniedCode?: AuthorizeDeniedCode;
  serviceLinkedDetails?: ServiceLinkedAuthorizationDetails;
}

export interface BatchAuthorizeRequest {
  userId: string;
  domain?: string;
  resource: string;
  action: string;
  protectedResource?: ProtectedResourceRef;
}

export interface BatchAuthorizeParams {
  organizationId: string;
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
