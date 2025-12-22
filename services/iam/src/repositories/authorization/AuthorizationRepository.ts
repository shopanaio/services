import {
  PREDEFINED_ROLES,
  type PredefinedRoleName,
} from "../../constants/index.js";

/**
 * Temporary stub for AuthorizationRepository.
 * Will be replaced with node-casbin implementation in Phase 2 migration.
 *
 * @see docs/migration-node-casbin.md
 */
export class AuthorizationRepository {
  constructor() {}

  // ============================================================================
  // Enforce Methods (stub - will be implemented with node-casbin)
  // ============================================================================

  async enforce(
    _tenantId: string,
    _userId: string,
    _resource: string,
    _action: string
  ): Promise<boolean> {
    console.warn("[AuthorizationRepository] enforce() not implemented - migration to node-casbin pending");
    return false;
  }

  async batchEnforce(
    _tenantId: string,
    _userId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    console.warn("[AuthorizationRepository] batchEnforce() not implemented - migration to node-casbin pending");
    return requests.map(() => false);
  }

  // ============================================================================
  // Role Methods (stub)
  // ============================================================================

  async getRoles(_tenantId: string): Promise<any[]> {
    console.warn("[AuthorizationRepository] getRoles() not implemented - migration to node-casbin pending");
    return [];
  }

  async getRole(_tenantId: string, _roleName: string): Promise<any | null> {
    console.warn("[AuthorizationRepository] getRole() not implemented - migration to node-casbin pending");
    return null;
  }

  async createRole(
    _tenantId: string,
    _roleName: string,
    _displayName: string,
    _description: string = ""
  ): Promise<boolean> {
    console.warn("[AuthorizationRepository] createRole() not implemented - migration to node-casbin pending");
    return false;
  }

  async updateRole(
    _tenantId: string,
    _roleName: string,
    _updates: { displayName?: string; description?: string }
  ): Promise<boolean> {
    console.warn("[AuthorizationRepository] updateRole() not implemented - migration to node-casbin pending");
    return false;
  }

  async deleteRole(_tenantId: string, _roleName: string): Promise<boolean> {
    console.warn("[AuthorizationRepository] deleteRole() not implemented - migration to node-casbin pending");
    return false;
  }

  isSystemRole(roleName: string): boolean {
    return Object.values(PREDEFINED_ROLES).includes(roleName as PredefinedRoleName);
  }

  // ============================================================================
  // User-Role Assignment Methods (stub)
  // ============================================================================

  async getUserRoles(_tenantId: string, _userId: string): Promise<string[]> {
    console.warn("[AuthorizationRepository] getUserRoles() not implemented - migration to node-casbin pending");
    return [];
  }

  async getTenantMembers(_tenantId: string): Promise<Array<{
    userId: string;
    roleName: string;
    roleDisplayName: string;
  }>> {
    console.warn("[AuthorizationRepository] getTenantMembers() not implemented - migration to node-casbin pending");
    return [];
  }

  async attachUserRole(
    _tenantId: string,
    _userId: string,
    _roleName: string
  ): Promise<boolean> {
    console.warn("[AuthorizationRepository] attachUserRole() not implemented - migration to node-casbin pending");
    return false;
  }

  async detachUserRole(
    _tenantId: string,
    _userId: string,
    _roleName: string
  ): Promise<boolean> {
    console.warn("[AuthorizationRepository] detachUserRole() not implemented - migration to node-casbin pending");
    return false;
  }

  // ============================================================================
  // Permission Methods (stub)
  // ============================================================================

  async getRolePermissions(
    _tenantId: string,
    _roleName: string
  ): Promise<any[]> {
    console.warn("[AuthorizationRepository] getRolePermissions() not implemented - migration to node-casbin pending");
    return [];
  }

  async deletePermission(_tenantId: string, _permissionName: string): Promise<boolean> {
    console.warn("[AuthorizationRepository] deletePermission() not implemented - migration to node-casbin pending");
    return false;
  }

  async createPermission(
    _tenantId: string,
    _roleName: string,
    _resource: string,
    _actions: string[],
    _effect: "Allow" | "Deny" = "Allow"
  ): Promise<boolean> {
    console.warn("[AuthorizationRepository] createPermission() not implemented - migration to node-casbin pending");
    return false;
  }

  async updateRolePermissions(
    _tenantId: string,
    _roleName: string,
    _permissions: Array<{
      resource: string;
      actions: string[];
      effect: "Allow" | "Deny";
    }>
  ): Promise<{ success: boolean; error?: string }> {
    console.warn("[AuthorizationRepository] updateRolePermissions() not implemented - migration to node-casbin pending");
    return { success: false, error: "Not implemented - migration to node-casbin pending" };
  }

  // ============================================================================
  // Role Hierarchy (stub)
  // ============================================================================

  async provisionRoleHierarchy(
    _tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.warn("[AuthorizationRepository] provisionRoleHierarchy() not implemented - migration to node-casbin pending");
    return { success: false, error: "Not implemented - migration to node-casbin pending" };
  }

  // ============================================================================
  // Model & Enforcer Setup (stub - for Casdoor compatibility)
  // ============================================================================

  async ensureModelExists(_tenantId: string): Promise<{ success: boolean; error?: string }> {
    console.warn("[AuthorizationRepository] ensureModelExists() not implemented - migration to node-casbin pending");
    return { success: false, error: "Not implemented - migration to node-casbin pending" };
  }

  async ensureEnforcerExists(_tenantId: string): Promise<{ success: boolean; error?: string }> {
    console.warn("[AuthorizationRepository] ensureEnforcerExists() not implemented - migration to node-casbin pending");
    return { success: false, error: "Not implemented - migration to node-casbin pending" };
  }

  // ============================================================================
  // Tenant Provisioning (stub)
  // ============================================================================

  async initialize(_tenantId: string): Promise<{ success: boolean; error?: string }> {
    console.warn("[AuthorizationRepository] initialize() not implemented - migration to node-casbin pending");
    return { success: false, error: "Not implemented - migration to node-casbin pending" };
  }

  async provisionTenantRoles(
    _tenantId: string,
    _ownerId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.warn("[AuthorizationRepository] provisionTenantRoles() not implemented - migration to node-casbin pending");
    return { success: false, error: "Not implemented - migration to node-casbin pending" };
  }

  async deprovisionTenantRoles(_tenantId: string): Promise<boolean> {
    console.warn("[AuthorizationRepository] deprovisionTenantRoles() not implemented - migration to node-casbin pending");
    return false;
  }
}
