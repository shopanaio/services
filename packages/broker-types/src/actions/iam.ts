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
  linkedOwnerType: string;
  linkedOwnerId: string;
}

export type ResourceManagementInput =
  | { managementMode: "organization" }
  | {
      managementMode: "service";
      linkedOwner: ServiceLinkedOwnerInput;
    };

export type CreateApplicationParams = {
  applicationId: string;
  userId: string;
  organizationId: string;
  name: string;
  displayName: string;
  description?: string;
  /**
   * System-owned storefront OAuth/OIDC preset. Protocol policy is still
   * selected by IAM; the owning service supplies only storefront URLs and
   * presentation defaults.
   */
  storefrontAuth?: {
    origin: string;
    redirectUri: string;
    postLogoutRedirectUri: string;
    defaultLocale: "en" | "uk" | "ru";
  };
} & ResourceManagementInput;

export interface CreateApplicationResult {
  success: boolean;
  applicationId?: string;
  error?: string;
}

export interface DeleteServiceLinkedApplicationParams {
  applicationId: string;
  organizationId: string;
  linkedOwner: ServiceLinkedOwnerInput;
}

export interface DeleteServiceLinkedApplicationResult {
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
  ownerType?: string;
  ownerId?: string;
}

export interface LinkedOwnerRef extends ProtectedResourceRef {
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
}

export interface ServiceLinkedAuthorizationDetails extends LinkedOwnerRef {}

export interface BrokerAuthorizeParams {
  subject?: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  resource: string;
  action: string;
}

export type AuthorizeParams = BrokerAuthorizeParams;

export type AuthorizeDeniedCode = "RESOURCE_SERVICE_LINKED";

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}

export interface BatchAuthorizeRequest {
  userId: string;
  domain?: string;
  resource: string;
  action: string;
}

export interface ProtectedResourceAuthorizeParams {
  protectedResource: ProtectedResourceRef;
}

export interface ProtectedResourceAuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  deniedCode?: AuthorizeDeniedCode;
  serviceLinkedDetails?: ServiceLinkedAuthorizationDetails;
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
