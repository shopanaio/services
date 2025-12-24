import { v7 as uuidv7 } from "uuid";
import { CasbinService } from "../../casbin/CasbinService.js";
import { RoleRepository } from "./RoleRepository.js";
import { UserRoleRepository } from "./UserRoleRepository.js";
import { TenantRepository } from "./TenantRepository.js";
import { OrganizationRepository } from "../organization/OrganizationRepository.js";
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
    private readonly tenantRepo: TenantRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  // ============================================================================
  // Enforce Methods
  // ============================================================================

  /**
   * Check if user has permission for resource/action in organization (org-wide, no domain)
   */
  async enforce(
    organizationId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Use empty domain for org-wide permissions
    return this.casbin.enforce(organizationId, userId, [], [[resource]], action);
  }

  /**
   * Batch check permissions (org-wide, no domain)
   */
  async batchEnforce(
    organizationId: string,
    userId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    // Use empty domain for org-wide permissions
    return this.casbin.batchEnforce(
      organizationId,
      userId,
      [],
      requests.map(r => ({ resource: [[r.resource]], action: r.action }))
    );
  }

  // ============================================================================
  // Role Methods
  // ============================================================================

  /**
   * Get all roles for an organization
   */
  async getRoles(organizationId: string) {
    return this.roleRepo.findByTenant(organizationId);
  }

  /**
   * Alias for getRoles (for compatibility)
   */
  async listRoles(organizationId: string) {
    return this.getRoles(organizationId);
  }

  /**
   * Get a specific role by name
   * @param domain - Domain scope (default: "*" for global roles)
   */
  async getRole(organizationId: string, roleName: string, domain: string = "*") {
    return this.roleRepo.findByName(organizationId, roleName, domain);
  }

  /**
   * Create a new role
   * @param domain - Domain scope (default: "*" for global roles)
   */
  async createRole(
    organizationId: string,
    roleName: string,
    displayName: string,
    description: string = "",
    isSystem: boolean = false,
    domain: string = "*"
  ) {
    return this.roleRepo.create({
      organizationId,
      domain,
      name: roleName,
      displayName,
      description,
      isSystem,
    });
  }

  /**
   * Update a role
   * @param domain - Domain scope (default: "*" for global roles)
   */
  async updateRole(
    organizationId: string,
    roleName: string,
    updates: { displayName?: string; description?: string },
    domain: string = "*"
  ) {
    return this.roleRepo.update(organizationId, roleName, updates, domain);
  }

  /**
   * Delete a role and all its policies
   * @param domain - Domain scope (default: "*" for global roles)
   */
  async deleteRole(organizationId: string, roleName: string, domain: string = "*"): Promise<boolean> {
    // Remove all policies for this role
    await this.casbin.removeFilteredPolicy(organizationId, roleName);

    // Delete role from database
    return this.roleRepo.delete(organizationId, roleName, domain);
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
   * Get user's roles in organization (returns role names only)
   */
  async getUserRoles(organizationId: string, userId: string): Promise<string[]> {
    const roles = await this.casbin.getRolesForUser(organizationId, userId);
    return roles.map(r => r.role);
  }

  /**
   * Get user's role with details in a tenant
   */
  async getUserRole(organizationId: string, userId: string) {
    const result = await this.userRoleRepo.findByTenantAndUser(organizationId, userId);
    return result?.role ?? null;
  }

  /**
   * Attach a role to user in organization (org-wide, no domain)
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

    // Add to Casbin (for enforcement) - empty domain for org-wide
    return this.casbin.assignRole(organizationId, userId, roleName, []);
  }

  /**
   * Detach a role from user in organization
   */
  async detachUserRole(
    organizationId: string,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    // Remove from database
    await this.userRoleRepo.delete(organizationId, userId);

    // Remove from Casbin - empty domain for org-wide
    return this.casbin.removeRole(organizationId, userId, roleName, []);
  }

  /**
   * Get all members of a tenant with their roles
   */
  async getTenantMembers(organizationId: string) {
    return this.userRoleRepo.findByTenant(organizationId);
  }

  /**
   * Get members for a specific domain (e.g., project)
   * Returns members with access to the specified domain or all domains (*)
   */
  async getMembersForDomain(organizationId: string, domain: string) {
    return this.userRoleRepo.findByTenantAndDomain(organizationId, domain);
  }

  /**
   * Attach a role to user for a specific domain (e.g., project)
   * @param domainParts - Domain as ScopePart[] (e.g., [["project", "abc-123"]])
   */
  async attachUserRoleForDomain(
    organizationId: string,
    userId: string,
    roleName: string,
    domainParts: Array<[string] | [string, string]>,
    grantedBy?: string
  ): Promise<{ success: boolean; grantedAt?: Date }> {
    // Get role from database
    const role = await this.roleRepo.findByName(organizationId, roleName);
    if (!role) {
      return { success: false };
    }

    // Build domain path string for DB storage
    const domainPath = this.casbin.buildPath(domainParts);

    // Save to database with domain
    const result = await this.userRoleRepo.upsertWithDomain({
      organizationId,
      userId,
      roleId: role.id,
      domain: domainPath,
      grantedBy,
    });

    // Add to Casbin with domain parts
    await this.casbin.assignRole(organizationId, userId, roleName, domainParts);

    return { success: true, grantedAt: result.grantedAt };
  }

  /**
   * Detach a role from user for a specific domain
   * @param domainParts - Domain as ScopePart[] (e.g., [["project", "abc-123"]])
   */
  async detachUserRoleFromDomain(
    organizationId: string,
    userId: string,
    domainParts: Array<[string] | [string, string]>
  ): Promise<boolean> {
    // Build domain path string for DB lookup
    const domainPath = this.casbin.buildPath(domainParts);

    // Get user's current role for this domain
    const members = await this.userRoleRepo.findByTenantAndDomain(organizationId, domainPath);
    const member = members.find(m => m.userId === userId);
    if (!member) {
      return false;
    }

    // Remove from database
    await this.userRoleRepo.deleteByDomain(organizationId, userId, domainPath);

    // Remove from Casbin
    await this.casbin.removeRole(organizationId, userId, member.roleName, domainParts);

    return true;
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
   * Create a permission for a role (org-wide, no domain)
   */
  async createPermission(
    organizationId: string,
    roleName: string,
    resource: string,
    actions: string[],
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    for (const action of actions) {
      // Use empty domain and resource as ScopePart[]
      await this.casbin.addPolicy(organizationId, roleName, [], [[resource]], action, effect);
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
   * Creates a new organization with auto-generated UUIDv7 and sets up roles.
   *
   * @param ownerId - Optional owner user ID to assign owner role
   * @returns Created organizationId on success
   */
  async provisionTenantRoles(
    ownerId?: string
  ): Promise<{ success: boolean; organizationId?: string; error?: string }> {
    try {
      // Create new organization (ID generated as UUIDv7)
      const orgId = uuidv7();
      const now = new Date();
      const newOrg = await this.organizationRepo.create({
        id: orgId,
        name: `Organization ${orgId}`,
        slug: `org-${orgId}`,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      const organizationId = newOrg.id;

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
