import type { CasdoorNodeClient, Permission, Role } from "@zaytra/casdoor-node-client-ext";
import {
  CASBIN_MODEL_NAME,
  CASBIN_ENFORCER_NAME,
  PERMISSION_PREFIX,
  PREDEFINED_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type PredefinedRoleName,
} from "../../constants/index.js";

/**
 * AuthorizationRepository handles all Casdoor operations for RBAC
 */
export class AuthorizationRepository {
  constructor(
    private readonly client: CasdoorNodeClient,
    private readonly organization: string
  ) {}

  // ============================================================================
  // Enforce Methods
  // ============================================================================

  /**
   * Check if user is authorized to perform action on resource
   *
   * @param userId - User ID (subject)
   * @param projectId - Project ID (domain)
   * @param resource - Resource name (object)
   * @param action - Action name (act)
   * @returns true if authorized
   */
  async enforce(
    userId: string,
    projectId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Build permission name for project
    const permissionId = `${this.organization}/${PERMISSION_PREFIX}-${projectId}`;
    const modelId = `${this.organization}/${CASBIN_MODEL_NAME}`;
    const enforcerId = `${this.organization}/${CASBIN_ENFORCER_NAME}`;

    // Casbin request: [sub, dom, obj, act]
    const casbinRequest = [userId, projectId, resource, action];

    try {
      const allowed = await this.client.sdk.enforce(
        permissionId,
        modelId,
        "", // resourceId not used in our model
        enforcerId,
        this.organization,
        casbinRequest
      );
      return allowed;
    } catch (error) {
      console.error("[AuthorizationRepository] enforce error:", error);
      return false;
    }
  }

  /**
   * Batch check multiple authorizations
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param requests - Array of {resource, action}
   * @returns Array of boolean results
   */
  async batchEnforce(
    userId: string,
    projectId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    const permissionId = `${this.organization}/${PERMISSION_PREFIX}-${projectId}`;
    const modelId = `${this.organization}/${CASBIN_MODEL_NAME}`;
    const enforcerId = `${this.organization}/${CASBIN_ENFORCER_NAME}`;

    // Build Casbin requests
    const casbinRequests = requests.map((req) => [
      userId,
      projectId,
      req.resource,
      req.action,
    ]);

    try {
      const results = await this.client.sdk.batchEnforce(
        permissionId,
        modelId,
        "",
        enforcerId,
        this.organization,
        casbinRequests
      );

      // batchEnforce returns boolean[][] - flatten to boolean[]
      return results.flat();
    } catch (error) {
      console.error("[AuthorizationRepository] batchEnforce error:", error);
      return requests.map(() => false);
    }
  }

  // ============================================================================
  // Role Methods
  // ============================================================================

  /**
   * Get all roles for a project
   */
  async getRoles(projectId: string): Promise<Role[]> {
    try {
      const response = await this.client.sdk.getRoles();
      const allRoles = response.data?.data ?? [];

      // Filter roles for this project (roles are stored with project as domain)
      return allRoles.filter(
        (role) =>
          role.owner === this.organization &&
          role.domains?.includes(projectId)
      );
    } catch (error) {
      console.error("[AuthorizationRepository] getRoles error:", error);
      return [];
    }
  }

  /**
   * Get a specific role
   */
  async getRole(projectId: string, roleName: string): Promise<Role | null> {
    try {
      const roleId = `${this.organization}/${roleName}`;
      const response = await this.client.sdk.getRole(roleId);
      return response.data?.data ?? null;
    } catch (error) {
      console.error("[AuthorizationRepository] getRole error:", error);
      return null;
    }
  }

  /**
   * Create a role in Casdoor
   */
  async createRole(
    projectId: string,
    roleName: string,
    displayName: string,
    description: string = ""
  ): Promise<boolean> {
    const role: Role = {
      owner: this.organization,
      name: roleName,
      createdTime: new Date().toISOString(),
      displayName,
      description,
      domains: [projectId],
      isEnabled: true,
    };

    try {
      const response = await this.client.sdk.addRole(role);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] createRole error:", error);
      return false;
    }
  }

  /**
   * Delete a role from Casdoor
   */
  async deleteRole(roleName: string): Promise<boolean> {
    try {
      const response = await this.client.sdk.deleteRole({
        owner: this.organization,
        name: roleName,
      } as Role);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] deleteRole error:", error);
      return false;
    }
  }

  // ============================================================================
  // User-Role Assignment Methods
  // ============================================================================

  /**
   * Get user's roles in a project
   *
   * Checks the Role.users array to find roles where user is a member
   */
  async getUserRoles(userId: string, projectId: string): Promise<string[]> {
    try {
      const roles = await this.getRoles(projectId);
      return roles
        .filter((role) => role.users?.includes(`${this.organization}/${userId}`))
        .map((role) => role.name);
    } catch (error) {
      console.error("[AuthorizationRepository] getUserRoles error:", error);
      return [];
    }
  }

  /**
   * Attach user to a role in a project
   *
   * Updates the Role.users array
   */
  async attachUserRole(
    userId: string,
    projectId: string,
    roleName: string
  ): Promise<boolean> {
    try {
      const role = await this.getRole(projectId, roleName);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${roleName} not found`);
        return false;
      }

      const userFullName = `${this.organization}/${userId}`;

      // Check if user already has this role
      if (role.users?.includes(userFullName)) {
        return true; // Already attached
      }

      // Add user to role
      const updatedRole: Role = {
        ...role,
        users: [...(role.users ?? []), userFullName],
      };

      const response = await this.client.sdk.updateRole(updatedRole);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] attachUserRole error:", error);
      return false;
    }
  }

  /**
   * Detach user from a role in a project
   */
  async detachUserRole(
    userId: string,
    projectId: string,
    roleName: string
  ): Promise<boolean> {
    try {
      const role = await this.getRole(projectId, roleName);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${roleName} not found`);
        return false;
      }

      const userFullName = `${this.organization}/${userId}`;

      // Remove user from role
      const updatedRole: Role = {
        ...role,
        users: (role.users ?? []).filter((u) => u !== userFullName),
      };

      const response = await this.client.sdk.updateRole(updatedRole);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] detachUserRole error:", error);
      return false;
    }
  }

  // ============================================================================
  // Permission Methods
  // ============================================================================

  /**
   * Create a permission in Casdoor
   *
   * Permissions are Casbin policies attached to roles
   */
  async createPermission(
    projectId: string,
    roleName: string,
    resource: string,
    actions: string[],
    effect: "Allow" | "Deny" = "Allow"
  ): Promise<boolean> {
    const permissionName = `${PERMISSION_PREFIX}-${projectId}-${roleName}-${resource}`;

    const permission: Permission = {
      owner: this.organization,
      name: permissionName,
      createdTime: new Date().toISOString(),
      displayName: `${roleName} - ${resource}`,
      description: `${effect} ${actions.join(", ")} on ${resource}`,
      roles: [`${this.organization}/${roleName}`],
      domains: [projectId],
      model: `${this.organization}/${CASBIN_MODEL_NAME}`,
      resourceType: resource,
      resources: [resource],
      actions,
      effect,
      isEnabled: true,
    };

    try {
      const response = await this.client.sdk.addPermission(permission);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] createPermission error:", error);
      return false;
    }
  }

  // ============================================================================
  // Project Provisioning
  // ============================================================================

  /**
   * Provision all predefined roles and permissions for a new project
   */
  async provisionProjectRoles(
    projectId: string,
    ownerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create all predefined roles
      for (const roleName of Object.values(PREDEFINED_ROLES)) {
        const displayName = ROLE_DISPLAY_NAMES[roleName];
        const description = ROLE_DESCRIPTIONS[roleName];

        const created = await this.createRole(
          projectId,
          `${projectId}-${roleName}`,
          displayName,
          description
        );

        if (!created) {
          return {
            success: false,
            error: `Failed to create role: ${roleName}`,
          };
        }

        // Create permissions for this role
        const permissions = ROLE_PERMISSIONS[roleName];

        for (const perm of permissions.allow) {
          const created = await this.createPermission(
            projectId,
            `${projectId}-${roleName}`,
            perm.resource,
            perm.actions,
            "Allow"
          );

          if (!created) {
            return {
              success: false,
              error: `Failed to create permission for ${roleName}: ${perm.resource}`,
            };
          }
        }

        // Create deny permissions if any
        if (permissions.deny) {
          for (const perm of permissions.deny) {
            const created = await this.createPermission(
              projectId,
              `${projectId}-${roleName}`,
              perm.resource,
              perm.actions,
              "Deny"
            );

            if (!created) {
              return {
                success: false,
                error: `Failed to create deny permission for ${roleName}: ${perm.resource}`,
              };
            }
          }
        }
      }

      // Attach owner role to the project creator
      const ownerRoleName = `${projectId}-${PREDEFINED_ROLES.OWNER}`;
      const attached = await this.attachUserRole(ownerId, projectId, ownerRoleName);

      if (!attached) {
        return {
          success: false,
          error: `Failed to attach owner role to user: ${ownerId}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("[AuthorizationRepository] provisionProjectRoles error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Deprovision all roles and permissions for a project
   */
  async deprovisionProjectRoles(projectId: string): Promise<boolean> {
    try {
      // Get all roles for this project
      const roles = await this.getRoles(projectId);

      // Delete each role (this should also clean up permissions)
      for (const role of roles) {
        await this.deleteRole(role.name);
      }

      return true;
    } catch (error) {
      console.error("[AuthorizationRepository] deprovisionProjectRoles error:", error);
      return false;
    }
  }
}
