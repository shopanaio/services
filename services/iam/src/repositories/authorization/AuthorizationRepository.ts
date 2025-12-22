import { CasbinService } from "../../casbin/CasbinService.js";
import { RoleRepository } from "./RoleRepository.js";
import { UserRoleRepository } from "./UserRoleRepository.js";
import { TenantRepository } from "./TenantRepository.js";
import {
  PREDEFINED_ROLES,
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  type PredefinedRoleName,
} from "../../constants/index.js";

/**
 * AuthorizationRepository - Main facade for authorization operations.
 *
 * Combines CasbinService (policy enforcement) with database repositories
 * (RoleRepository, UserRoleRepository, TenantRepository) to provide
 * a unified API for role-based access control.
 */
export class AuthorizationRepository {
  constructor(
    private readonly casbin: CasbinService,
    private readonly roleRepo: RoleRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly tenantRepo: TenantRepository
  ) {}

  // ============================================================================
  // Enforce Methods
  // ============================================================================

  /**
   * Check if user has permission for resource/action in tenant
   */
  async enforce(
    tenantId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    return this.casbin.enforce(tenantId, userId, resource, action);
  }

  /**
   * Batch check permissions
   */
  async batchEnforce(
    tenantId: string,
    userId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    return this.casbin.batchEnforce(tenantId, userId, requests);
  }

  // ============================================================================
  // Role Methods
  // ============================================================================

  /**
   * Get all roles for a tenant
   */
  async getRoles(tenantId: string) {
    return this.roleRepo.findByTenant(tenantId);
  }

  /**
   * Get a specific role by name
   */
  async getRole(tenantId: string, roleName: string) {
    return this.roleRepo.findByName(tenantId, roleName);
  }

  /**
   * Create a new role
   */
  async createRole(
    tenantId: string,
    roleName: string,
    displayName: string,
    description: string = "",
    isSystem: boolean = false
  ) {
    return this.roleRepo.create({
      tenantId,
      name: roleName,
      displayName,
      description,
      isSystem,
    });
  }

  /**
   * Update a role
   */
  async updateRole(
    tenantId: string,
    roleName: string,
    updates: { displayName?: string; description?: string }
  ) {
    return this.roleRepo.update(tenantId, roleName, updates);
  }

  /**
   * Delete a role and all its policies
   */
  async deleteRole(tenantId: string, roleName: string): Promise<boolean> {
    // Remove all policies for this role
    await this.casbin.removeFilteredPolicy(tenantId, roleName);

    // Delete role from database
    return this.roleRepo.delete(tenantId, roleName);
  }

  /**
   * Check if role is a system/predefined role
   */
  isSystemRole(roleName: string): boolean {
    return Object.values(PREDEFINED_ROLES).includes(roleName as PredefinedRoleName);
  }

  // ============================================================================
  // User-Role Methods
  // ============================================================================

  /**
   * Get user's roles in a tenant
   */
  async getUserRoles(tenantId: string, userId: string): Promise<string[]> {
    return this.casbin.getRolesForUser(tenantId, userId);
  }

  /**
   * Attach a role to user in tenant
   */
  async attachUserRole(
    tenantId: string,
    userId: string,
    roleName: string,
    grantedBy?: string
  ): Promise<boolean> {
    // Get role from database
    const role = await this.roleRepo.findByName(tenantId, roleName);
    if (!role) {
      console.warn(`[AuthorizationRepository] Role "${roleName}" not found in tenant ${tenantId}`);
      return false;
    }

    // Save to database (user-role mapping)
    await this.userRoleRepo.upsert({
      tenantId,
      userId,
      roleId: role.id,
      grantedBy,
    });

    // Add to Casbin (for enforcement)
    return this.casbin.addRoleForUser(tenantId, userId, roleName);
  }

  /**
   * Detach a role from user in tenant
   */
  async detachUserRole(
    tenantId: string,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    // Remove from database
    await this.userRoleRepo.delete(tenantId, userId);

    // Remove from Casbin
    return this.casbin.removeRoleForUser(tenantId, userId, roleName);
  }

  /**
   * Get all members of a tenant with their roles
   */
  async getTenantMembers(tenantId: string) {
    return this.userRoleRepo.findByTenant(tenantId);
  }

  // ============================================================================
  // Permission Methods
  // ============================================================================

  /**
   * Get permissions for a role
   */
  async getRolePermissions(tenantId: string, roleName: string) {
    const policies = await this.casbin.getPolicies(tenantId);
    return policies.filter((p) => p[0] === roleName);
  }

  /**
   * Create a permission for a role
   */
  async createPermission(
    tenantId: string,
    roleName: string,
    resource: string,
    actions: string[],
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    for (const action of actions) {
      await this.casbin.addPolicy(tenantId, roleName, resource, action, effect);
    }
    return true;
  }

  /**
   * Delete a specific permission (not used directly, but kept for compatibility)
   */
  async deletePermission(tenantId: string, _permissionName: string): Promise<boolean> {
    // In the new system, permissions are managed per-role
    console.warn("[AuthorizationRepository] deletePermission() - use deleteRolePermissions() instead");
    return false;
  }

  /**
   * Delete all permissions for a role
   */
  async deleteRolePermissions(tenantId: string, roleName: string): Promise<boolean> {
    return this.casbin.removeFilteredPolicy(tenantId, roleName);
  }

  /**
   * Update role permissions (replace all)
   */
  async updateRolePermissions(
    tenantId: string,
    roleName: string,
    permissions: Array<{
      resource: string;
      actions: string[];
      effect: "Allow" | "Deny";
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete existing permissions
      await this.deleteRolePermissions(tenantId, roleName);

      // Create new permissions
      for (const perm of permissions) {
        const effect = perm.effect.toLowerCase() as "allow" | "deny";
        await this.createPermission(tenantId, roleName, perm.resource, perm.actions, effect);
      }

      // Invalidate enforcer cache
      await this.casbin.invalidateEnforcer(tenantId);

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // Role Hierarchy
  // ============================================================================

  /**
   * Add role hierarchy (parent inherits child permissions)
   */
  async addRoleHierarchy(
    tenantId: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    return this.casbin.addRoleHierarchy(tenantId, parentRole, childRole);
  }

  /**
   * Provision standard role hierarchy
   */
  async provisionRoleHierarchy(
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    const hierarchy: [string, string][] = [
      [PREDEFINED_ROLES.OWNER, PREDEFINED_ROLES.ADMIN],
      [PREDEFINED_ROLES.ADMIN, PREDEFINED_ROLES.MANAGER],
      [PREDEFINED_ROLES.MANAGER, PREDEFINED_ROLES.SUPPORT],
      [PREDEFINED_ROLES.SUPPORT, PREDEFINED_ROLES.VIEWER],
    ];

    try {
      for (const [parent, child] of hierarchy) {
        await this.addRoleHierarchy(tenantId, parent, child);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // Model & Enforcer Setup (legacy compatibility methods)
  // ============================================================================

  /**
   * Ensure model exists (no-op in new system, model is embedded)
   */
  async ensureModelExists(_tenantId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Ensure enforcer exists (no-op in new system, created on demand)
   */
  async ensureEnforcerExists(_tenantId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  // ============================================================================
  // Tenant Provisioning
  // ============================================================================

  /**
   * Initialize tenant (alias for provisionTenantRoles without owner)
   */
  async initialize(): Promise<{ success: boolean; tenantId?: string; error?: string }> {
    return this.provisionTenantRoles();
  }

  /**
   * Provision all predefined roles and permissions for a new tenant.
   *
   * Creates a new tenant with auto-generated UUIDv7 and sets up roles.
   *
   * @param ownerId - Optional owner user ID to assign owner role
   * @returns Created tenantId on success
   */
  async provisionTenantRoles(
    ownerId?: string
  ): Promise<{ success: boolean; tenantId?: string; error?: string }> {
    try {
      // Create new tenant (ID generated as UUIDv7)
      const newTenant = await this.tenantRepo.create();
      const tenantId = newTenant.id;

      // Create predefined roles
      for (const roleName of Object.values(PREDEFINED_ROLES)) {
        await this.createRole(
          tenantId,
          roleName,
          ROLE_DISPLAY_NAMES[roleName],
          ROLE_DESCRIPTIONS[roleName],
          true // isSystem
        );

        // Create permissions for role
        const permissions = ROLE_PERMISSIONS[roleName];

        for (const perm of permissions.allow) {
          await this.createPermission(
            tenantId,
            roleName,
            perm.resource,
            perm.actions,
            "allow"
          );
        }

        if (permissions.deny) {
          for (const perm of permissions.deny) {
            await this.createPermission(
              tenantId,
              roleName,
              perm.resource,
              perm.actions,
              "deny"
            );
          }
        }
      }

      // Setup role hierarchy
      await this.provisionRoleHierarchy(tenantId);

      // Assign owner role to creator if provided
      if (ownerId) {
        await this.attachUserRole(tenantId, ownerId, PREDEFINED_ROLES.OWNER);
      }

      return { success: true, tenantId };
    } catch (error) {
      console.error("[AuthorizationRepository] provisionTenantRoles error:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Deprovision all roles and permissions for a tenant
   */
  async deprovisionTenantRoles(tenantId: string): Promise<boolean> {
    try {
      // Delete all user-role assignments
      await this.userRoleRepo.deleteByTenant(tenantId);

      // Delete all roles
      await this.roleRepo.deleteByTenant(tenantId);

      // Invalidate enforcer cache
      await this.casbin.invalidateEnforcer(tenantId);

      return true;
    } catch (error) {
      console.error("[AuthorizationRepository] deprovisionTenantRoles error:", error);
      return false;
    }
  }
}
