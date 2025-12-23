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
    organizationId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    return this.casbin.enforce(organizationId, userId, resource, action);
  }

  /**
   * Batch check permissions
   */
  async batchEnforce(
    organizationId: string,
    userId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    return this.casbin.batchEnforce(organizationId, userId, requests);
  }

  // ============================================================================
  // Role Methods
  // ============================================================================

  /**
   * Get all roles for a tenant
   */
  async getRoles(organizationId: string) {
    return this.roleRepo.findByTenant(organizationId);
  }

  /**
   * Get a specific role by name
   */
  async getRole(organizationId: string, roleName: string) {
    return this.roleRepo.findByName(organizationId, roleName);
  }

  /**
   * Create a new role
   */
  async createRole(
    organizationId: string,
    roleName: string,
    displayName: string,
    description: string = "",
    isSystem: boolean = false
  ) {
    return this.roleRepo.create({
      organizationId,
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
    organizationId: string,
    roleName: string,
    updates: { displayName?: string; description?: string }
  ) {
    return this.roleRepo.update(organizationId, roleName, updates);
  }

  /**
   * Delete a role and all its policies
   */
  async deleteRole(organizationId: string, roleName: string): Promise<boolean> {
    // Remove all policies for this role
    await this.casbin.removeFilteredPolicy(organizationId, roleName);

    // Delete role from database
    return this.roleRepo.delete(organizationId, roleName);
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
  async getUserRoles(organizationId: string, userId: string): Promise<string[]> {
    return this.casbin.getRolesForUser(organizationId, userId);
  }

  /**
   * Get user's role with details in a tenant
   */
  async getUserRole(organizationId: string, userId: string) {
    const result = await this.userRoleRepo.findByTenantAndUser(organizationId, userId);
    return result?.role ?? null;
  }

  /**
   * Attach a role to user in tenant
   */
  async attachUserRole(
    organizationId: string,
    userId: string,
    roleName: string,
    grantedBy?: string
  ): Promise<boolean> {
    // Get role from database
    const role = await this.roleRepo.findByName(organizationId, roleName);
    if (!role) {
      return false;
    }

    // Save to database (user-role mapping)
    await this.userRoleRepo.upsert({
      organizationId,
      userId,
      roleId: role.id,
      grantedBy,
    });

    // Add to Casbin (for enforcement)
    return this.casbin.addRoleForUser(organizationId, userId, roleName);
  }

  /**
   * Detach a role from user in tenant
   */
  async detachUserRole(
    organizationId: string,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    // Remove from database
    await this.userRoleRepo.delete(organizationId, userId);

    // Remove from Casbin
    return this.casbin.removeRoleForUser(organizationId, userId, roleName);
  }

  /**
   * Get all members of a tenant with their roles
   */
  async getTenantMembers(organizationId: string) {
    return this.userRoleRepo.findByTenant(organizationId);
  }

  // ============================================================================
  // Permission Methods
  // ============================================================================

  /**
   * Get permissions for a role
   */
  async getRolePermissions(organizationId: string, roleName: string) {
    const policies = await this.casbin.getPolicies(organizationId);
    return policies.filter((p) => p[0] === roleName);
  }

  /**
   * Create a permission for a role
   */
  async createPermission(
    organizationId: string,
    roleName: string,
    resource: string,
    actions: string[],
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    for (const action of actions) {
      await this.casbin.addPolicy(organizationId, roleName, resource, action, effect);
    }
    return true;
  }

  /**
   * Delete a specific permission (not used directly, but kept for compatibility)
   */
  async deletePermission(_organizationId: string, _permissionName: string): Promise<boolean> {
    // In the new system, permissions are managed per-role
    console.warn("[AuthorizationRepository] deletePermission() - use deleteRolePermissions() instead");
    return false;
  }

  /**
   * Delete all permissions for a role
   */
  async deleteRolePermissions(organizationId: string, roleName: string): Promise<boolean> {
    return this.casbin.removeFilteredPolicy(organizationId, roleName);
  }

  /**
   * Update role permissions (replace all)
   */
  async updateRolePermissions(
    organizationId: string,
    roleName: string,
    permissions: Array<{
      resource: string;
      actions: string[];
      effect: "Allow" | "Deny";
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete existing permissions
      await this.deleteRolePermissions(organizationId, roleName);

      // Create new permissions
      for (const perm of permissions) {
        const effect = perm.effect.toLowerCase() as "allow" | "deny";
        await this.createPermission(organizationId, roleName, perm.resource, perm.actions, effect);
      }

      // Invalidate enforcer cache
      await this.casbin.invalidateEnforcer(organizationId);

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
    organizationId: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    return this.casbin.addRoleHierarchy(organizationId, parentRole, childRole);
  }

  /**
   * Get roles that a role inherits from
   */
  async getRoleInherits(organizationId: string, roleName: string): Promise<string[]> {
    return this.casbin.getRoleInherits(organizationId, roleName);
  }

  /**
   * Update role hierarchy (replace all inherits)
   */
  async updateRoleInherits(
    organizationId: string,
    roleName: string,
    inherits: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove existing inherits
      await this.casbin.removeAllRoleHierarchy(organizationId, roleName);

      // Add new inherits
      for (const inheritRole of inherits) {
        await this.casbin.addRoleHierarchy(organizationId, roleName, inheritRole);
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
  async ensureModelExists(_organizationId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Ensure enforcer exists (no-op in new system, created on demand)
   */
  async ensureEnforcerExists(_organizationId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  // ============================================================================
  // Tenant Provisioning
  // ============================================================================

  /**
   * Initialize tenant (alias for provisionTenantRoles without owner)
   */
  async initialize(): Promise<{ success: boolean; organizationId?: string; error?: string }> {
    return this.provisionTenantRoles();
  }

  /**
   * Provision all predefined roles and permissions for a new tenant.
   *
   * Creates a new tenant with auto-generated UUIDv7 and sets up roles.
   *
   * @param ownerId - Optional owner user ID to assign owner role
   * @returns Created organizationId on success
   */
  async provisionTenantRoles(
    ownerId?: string
  ): Promise<{ success: boolean; organizationId?: string; error?: string }> {
    try {
      // Create new tenant (ID generated as UUIDv7)
      const newTenant = await this.tenantRepo.create();
      const organizationId = newTenant.id;

      // Create predefined roles
      for (const roleName of Object.values(PREDEFINED_ROLES)) {
        await this.createRole(
          organizationId,
          roleName,
          ROLE_DISPLAY_NAMES[roleName],
          ROLE_DESCRIPTIONS[roleName],
          true // isSystem
        );

        // Create permissions for role
        const permissions = ROLE_PERMISSIONS[roleName];

        for (const perm of permissions.allow) {
          await this.createPermission(
            organizationId,
            roleName,
            perm.resource,
            perm.actions,
            "allow"
          );
        }

        if (permissions.deny) {
          for (const perm of permissions.deny) {
            await this.createPermission(
              organizationId,
              roleName,
              perm.resource,
              perm.actions,
              "deny"
            );
          }
        }
      }

      // Assign owner role to creator if provided
      if (ownerId) {
        await this.attachUserRole(organizationId, ownerId, PREDEFINED_ROLES.OWNER);
      }

      return { success: true, organizationId };
    } catch (error) {
      console.error("[AuthorizationRepository] provisionTenantRoles error:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Deprovision all roles and permissions for a tenant
   */
  async deprovisionTenantRoles(organizationId: string): Promise<boolean> {
    try {
      // Delete all user-role assignments
      await this.userRoleRepo.deleteByTenant(organizationId);

      // Delete all roles
      await this.roleRepo.deleteByTenant(organizationId);

      // Invalidate enforcer cache
      await this.casbin.invalidateEnforcer(organizationId);

      return true;
    } catch (error) {
      console.error("[AuthorizationRepository] deprovisionTenantRoles error:", error);
      return false;
    }
  }
}
