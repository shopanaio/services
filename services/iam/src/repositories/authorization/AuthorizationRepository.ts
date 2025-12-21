import type { CasdoorNodeClient, Permission, Role } from "@zaytra/casdoor-node-client-ext";
import {
  CASBIN_MODEL_NAME,
  CASBIN_MODEL_TEXT,
  CASBIN_ENFORCER_NAME,
  PERMISSION_PREFIX,
  PREDEFINED_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type PredefinedRoleName,
} from "../../constants/index.js";

/**
 * Casdoor Model type
 */
interface CasdoorModel {
  owner: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  description?: string;
  modelText: string;
}

/**
 * Casdoor Enforcer type
 */
interface CasdoorEnforcer {
  owner: string;
  name: string;
  createdTime?: string;
  updatedTime?: string;
  displayName?: string;
  description?: string;
  model: string;
  adapter: string;
  isEnabled?: boolean;
}

/**
 * AuthorizationRepository handles all Casdoor operations for RBAC
 */
export class AuthorizationRepository {
  private modelInitialized = false;
  private enforcerInitialized = false;

  constructor(
    private readonly client: CasdoorNodeClient,
    private readonly organization: string
  ) {}

  // ============================================================================
  // Model & Enforcer Setup Methods
  // ============================================================================

  /**
   * Ensure Casbin model exists in Casdoor
   * Creates the RBAC with domains model if it doesn't exist
   */
  async ensureModelExists(): Promise<{ success: boolean; error?: string }> {
    if (this.modelInitialized) {
      return { success: true };
    }

    try {
      // Check if model already exists
      const existingModel = await this.getModel(CASBIN_MODEL_NAME);
      if (existingModel) {
        console.log(`[AuthorizationRepository] Model ${CASBIN_MODEL_NAME} already exists`);
        this.modelInitialized = true;
        return { success: true };
      }

      // Create the model
      const model: CasdoorModel = {
        owner: this.organization,
        name: CASBIN_MODEL_NAME,
        createdTime: new Date().toISOString(),
        displayName: "RBAC with Domains",
        description: "RBAC model with domain/tenant support for multi-tenant SaaS",
        modelText: CASBIN_MODEL_TEXT,
      };

      const response = await this.client.sdk.addModel(model as any);
      const data = response.data as any;

      if (data?.status === "ok") {
        console.log(`[AuthorizationRepository] Created model: ${CASBIN_MODEL_NAME}`);
        this.modelInitialized = true;
        return { success: true };
      }

      return {
        success: false,
        error: `Failed to create model: ${data?.msg || JSON.stringify(data)}`,
      };
    } catch (error) {
      console.error("[AuthorizationRepository] ensureModelExists error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Casbin model by name
   */
  async getModel(modelName: string): Promise<CasdoorModel | null> {
    try {
      const response = await this.client.sdk.getModel(modelName);
      return (response.data as any)?.data ?? null;
    } catch (error) {
      // Model not found returns error
      return null;
    }
  }

  /**
   * Ensure Casbin enforcer exists in Casdoor
   * Creates the enforcer if it doesn't exist
   */
  async ensureEnforcerExists(): Promise<{ success: boolean; error?: string }> {
    if (this.enforcerInitialized) {
      return { success: true };
    }

    try {
      // First ensure model exists
      const modelResult = await this.ensureModelExists();
      if (!modelResult.success) {
        return modelResult;
      }

      // Check if enforcer already exists
      const existingEnforcer = await this.getEnforcer(CASBIN_ENFORCER_NAME);
      if (existingEnforcer) {
        console.log(`[AuthorizationRepository] Enforcer ${CASBIN_ENFORCER_NAME} already exists`);
        this.enforcerInitialized = true;
        return { success: true };
      }

      // Create the enforcer
      const enforcer: CasdoorEnforcer = {
        owner: this.organization,
        name: CASBIN_ENFORCER_NAME,
        createdTime: new Date().toISOString(),
        displayName: "Shopana Enforcer",
        description: "Main enforcer for Shopana authorization",
        model: `${this.organization}/${CASBIN_MODEL_NAME}`,
        adapter: "", // Empty adapter - policies stored in Casdoor
        isEnabled: true,
      };

      const response = await this.client.sdk.addEnforcer(enforcer as any);
      const data = response.data as any;

      if (data?.status === "ok") {
        console.log(`[AuthorizationRepository] Created enforcer: ${CASBIN_ENFORCER_NAME}`);
        this.enforcerInitialized = true;
        return { success: true };
      }

      return {
        success: false,
        error: `Failed to create enforcer: ${data?.msg || JSON.stringify(data)}`,
      };
    } catch (error) {
      console.error("[AuthorizationRepository] ensureEnforcerExists error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Casbin enforcer by name
   */
  async getEnforcer(enforcerName: string): Promise<CasdoorEnforcer | null> {
    try {
      const response = await this.client.sdk.getEnforcer(enforcerName);
      return (response.data as any)?.data ?? null;
    } catch (error) {
      // Enforcer not found returns error
      return null;
    }
  }

  /**
   * Initialize authorization infrastructure
   * Call this on service startup to ensure model and enforcer exist
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    const enforcerResult = await this.ensureEnforcerExists();
    if (!enforcerResult.success) {
      return enforcerResult;
    }

    console.log("[AuthorizationRepository] Authorization infrastructure initialized");
    return { success: true };
  }

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
   * Update a role in Casdoor
   */
  async updateRole(
    projectId: string,
    roleName: string,
    updates: {
      displayName?: string;
      description?: string;
    }
  ): Promise<boolean> {
    try {
      const role = await this.getRole(projectId, roleName);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${roleName} not found`);
        return false;
      }

      const updatedRole: Role = {
        ...role,
        displayName: updates.displayName ?? role.displayName,
        description: updates.description ?? role.description,
      };

      const response = await this.client.sdk.updateRole(updatedRole);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] updateRole error:", error);
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

  /**
   * Check if role is a predefined system role
   */
  isSystemRole(roleName: string, projectId: string): boolean {
    const systemRoleNames = Object.values(PREDEFINED_ROLES).map(
      (role) => `${projectId}-${role}`
    );
    return systemRoleNames.includes(roleName);
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
    const permissionName = `${PERMISSION_PREFIX}-${projectId}-${roleName}-${resource}-${effect.toLowerCase()}`;

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

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(
    projectId: string,
    roleName: string
  ): Promise<Permission[]> {
    try {
      const response = await this.client.sdk.getPermissions();
      const allPermissions = (response.data as any)?.data ?? [];

      // Filter permissions for this role
      const roleFullName = `${this.organization}/${roleName}`;
      return allPermissions.filter(
        (perm: Permission) =>
          perm.owner === this.organization &&
          perm.domains?.includes(projectId) &&
          perm.roles?.includes(roleFullName)
      );
    } catch (error) {
      console.error("[AuthorizationRepository] getRolePermissions error:", error);
      return [];
    }
  }

  /**
   * Delete a permission
   */
  async deletePermission(permissionName: string): Promise<boolean> {
    try {
      const response = await this.client.sdk.deletePermission({
        owner: this.organization,
        name: permissionName,
      } as Permission);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] deletePermission error:", error);
      return false;
    }
  }

  /**
   * Update role permissions
   * Replaces all permissions for a role with new ones
   */
  async updateRolePermissions(
    projectId: string,
    roleName: string,
    permissions: Array<{
      resource: string;
      actions: string[];
      effect: "Allow" | "Deny";
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing permissions
      const existingPermissions = await this.getRolePermissions(projectId, roleName);

      // Delete all existing permissions
      for (const perm of existingPermissions) {
        const deleted = await this.deletePermission(perm.name);
        if (!deleted) {
          return {
            success: false,
            error: `Failed to delete existing permission: ${perm.name}`,
          };
        }
      }

      // Create new permissions
      for (const perm of permissions) {
        const created = await this.createPermission(
          projectId,
          roleName,
          perm.resource,
          perm.actions,
          perm.effect
        );

        if (!created) {
          return {
            success: false,
            error: `Failed to create permission for ${perm.resource}`,
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error("[AuthorizationRepository] updateRolePermissions error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
