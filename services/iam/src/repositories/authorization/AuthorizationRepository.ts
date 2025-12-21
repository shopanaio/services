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
 *
 * TENANT ISOLATION:
 * Each tenant has its own Organization, Model, Enforcer, Roles, and Permissions.
 * The `tenantOrg` parameter identifies the tenant's Casdoor organization.
 */
export class AuthorizationRepository {
  /** Track initialized models per tenant */
  private initializedModels: Set<string> = new Set();
  /** Track initialized enforcers per tenant */
  private initializedEnforcers: Set<string> = new Set();

  constructor(
    private readonly client: CasdoorNodeClient,
    /** Admin organization - used for creating new tenant orgs */
    private readonly adminOrganization: string
  ) {}

  // ============================================================================
  // Model & Enforcer Setup Methods
  // ============================================================================

  /**
   * Ensure Casbin model exists for a tenant organization
   * Creates the RBAC model in the tenant's organization if it doesn't exist
   *
   * @param tenantOrg - Tenant organization name (e.g., "org-project-a")
   */
  async ensureModelExists(tenantOrg: string): Promise<{ success: boolean; error?: string }> {
    if (this.initializedModels.has(tenantOrg)) {
      return { success: true };
    }

    try {
      // Check if model already exists
      const modelId = `${tenantOrg}/${CASBIN_MODEL_NAME}`;
      const existingModel = await this.getModel(modelId);
      if (existingModel) {
        console.log(`[AuthorizationRepository] Model ${modelId} already exists`);
        this.initializedModels.add(tenantOrg);
        return { success: true };
      }

      // Create the model for this tenant
      const model: CasdoorModel = {
        owner: tenantOrg,
        name: CASBIN_MODEL_NAME,
        createdTime: new Date().toISOString(),
        displayName: "RBAC Model",
        description: "RBAC model for tenant authorization",
        modelText: CASBIN_MODEL_TEXT,
      };

      const response = await this.client.sdk.addModel(model as any);
      const data = response.data as any;

      if (data?.status === "ok") {
        console.log(`[AuthorizationRepository] Created model: ${modelId}`);
        this.initializedModels.add(tenantOrg);
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
   * Get Casbin model by full ID (owner/name)
   */
  async getModel(modelId: string): Promise<CasdoorModel | null> {
    try {
      const response = await this.client.sdk.getModel(modelId);
      return (response.data as any)?.data ?? null;
    } catch (error) {
      // Model not found returns error
      return null;
    }
  }

  /**
   * Ensure Casbin enforcer exists for a tenant organization
   * Creates the enforcer in the tenant's organization if it doesn't exist
   *
   * @param tenantOrg - Tenant organization name (e.g., "org-project-a")
   */
  async ensureEnforcerExists(tenantOrg: string): Promise<{ success: boolean; error?: string }> {
    if (this.initializedEnforcers.has(tenantOrg)) {
      return { success: true };
    }

    try {
      // First ensure model exists for this tenant
      const modelResult = await this.ensureModelExists(tenantOrg);
      if (!modelResult.success) {
        return modelResult;
      }

      // Check if enforcer already exists
      const enforcerId = `${tenantOrg}/${CASBIN_ENFORCER_NAME}`;
      const existingEnforcer = await this.getEnforcer(enforcerId);
      if (existingEnforcer) {
        console.log(`[AuthorizationRepository] Enforcer ${enforcerId} already exists`);
        this.initializedEnforcers.add(tenantOrg);
        return { success: true };
      }

      // Create the enforcer for this tenant
      const enforcer: CasdoorEnforcer = {
        owner: tenantOrg,
        name: CASBIN_ENFORCER_NAME,
        createdTime: new Date().toISOString(),
        displayName: "Tenant Enforcer",
        description: "Enforcer for tenant authorization",
        model: `${tenantOrg}/${CASBIN_MODEL_NAME}`,
        adapter: "", // Empty adapter - policies stored in Casdoor
        isEnabled: true,
      };

      const response = await this.client.sdk.addEnforcer(enforcer as any);
      const data = response.data as any;

      if (data?.status === "ok") {
        console.log(`[AuthorizationRepository] Created enforcer: ${enforcerId}`);
        this.initializedEnforcers.add(tenantOrg);
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
   * Get Casbin enforcer by full ID (owner/name)
   */
  async getEnforcer(enforcerId: string): Promise<CasdoorEnforcer | null> {
    try {
      const response = await this.client.sdk.getEnforcer(enforcerId);
      return (response.data as any)?.data ?? null;
    } catch (error) {
      // Enforcer not found returns error
      return null;
    }
  }

  /**
   * Initialize authorization infrastructure for a tenant
   *
   * @param tenantOrg - Tenant organization name (e.g., "org-project-a")
   */
  async initialize(tenantOrg: string): Promise<{ success: boolean; error?: string }> {
    const enforcerResult = await this.ensureEnforcerExists(tenantOrg);
    if (!enforcerResult.success) {
      return enforcerResult;
    }

    console.log(`[AuthorizationRepository] Authorization infrastructure initialized for ${tenantOrg}`);
    return { success: true };
  }

  // ============================================================================
  // Enforce Methods
  // ============================================================================

  /**
   * Check if user is authorized to perform action on resource
   *
   * @param tenantOrg - Tenant organization name (e.g., "org-project-a")
   * @param userId - User ID (subject)
   * @param resource - Resource name (object)
   * @param action - Action name (act)
   * @returns true if authorized
   */
  async enforce(
    tenantOrg: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Build IDs for tenant organization
    const permissionId = `${tenantOrg}/${PERMISSION_PREFIX}`;
    const modelId = `${tenantOrg}/${CASBIN_MODEL_NAME}`;
    const enforcerId = `${tenantOrg}/${CASBIN_ENFORCER_NAME}`;

    // Casbin request: [sub, obj, act] - no domain needed
    const casbinRequest = [userId, resource, action];

    try {
      const allowed = await this.client.sdk.enforce(
        permissionId,
        modelId,
        "", // resourceId not used in our model
        enforcerId,
        tenantOrg,
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
   * @param tenantOrg - Tenant organization name
   * @param userId - User ID
   * @param requests - Array of {resource, action}
   * @returns Array of boolean results
   */
  async batchEnforce(
    tenantOrg: string,
    userId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    const permissionId = `${tenantOrg}/${PERMISSION_PREFIX}`;
    const modelId = `${tenantOrg}/${CASBIN_MODEL_NAME}`;
    const enforcerId = `${tenantOrg}/${CASBIN_ENFORCER_NAME}`;

    // Build Casbin requests: [sub, obj, act] - no domain
    const casbinRequests = requests.map((req) => [
      userId,
      req.resource,
      req.action,
    ]);

    try {
      const results = await this.client.sdk.batchEnforce(
        permissionId,
        modelId,
        "",
        enforcerId,
        tenantOrg,
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
   * Get all roles for a tenant
   *
   * @param tenantOrg - Tenant organization name
   */
  async getRoles(tenantOrg: string): Promise<Role[]> {
    try {
      const response = await this.client.sdk.getRoles();
      const allRoles = response.data?.data ?? [];

      // Filter roles for this tenant organization
      return allRoles.filter((role) => role.owner === tenantOrg);
    } catch (error) {
      console.error("[AuthorizationRepository] getRoles error:", error);
      return [];
    }
  }

  /**
   * Get a specific role
   *
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name (e.g., "owner", "admin")
   */
  async getRole(tenantOrg: string, roleName: string): Promise<Role | null> {
    try {
      const roleId = `${tenantOrg}/${roleName}`;
      const response = await this.client.sdk.getRole(roleId);
      return response.data?.data ?? null;
    } catch (error) {
      console.error("[AuthorizationRepository] getRole error:", error);
      return null;
    }
  }

  /**
   * Create a role in Casdoor
   *
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name (e.g., "owner", "admin")
   * @param displayName - Human-readable name
   * @param description - Role description
   */
  async createRole(
    tenantOrg: string,
    roleName: string,
    displayName: string,
    description: string = ""
  ): Promise<boolean> {
    const role: Role = {
      owner: tenantOrg,
      name: roleName,
      createdTime: new Date().toISOString(),
      displayName,
      description,
      domains: [], // No domains needed - isolation via tenant org
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
   *
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name
   * @param updates - Fields to update
   */
  async updateRole(
    tenantOrg: string,
    roleName: string,
    updates: {
      displayName?: string;
      description?: string;
    }
  ): Promise<boolean> {
    try {
      const role = await this.getRole(tenantOrg, roleName);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${roleName} not found in ${tenantOrg}`);
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
   *
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name
   */
  async deleteRole(tenantOrg: string, roleName: string): Promise<boolean> {
    try {
      const response = await this.client.sdk.deleteRole({
        owner: tenantOrg,
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
   *
   * @param roleName - Simple role name (e.g., "owner", "admin")
   */
  isSystemRole(roleName: string): boolean {
    return Object.values(PREDEFINED_ROLES).includes(roleName as PredefinedRoleName);
  }

  // ============================================================================
  // User-Role Assignment Methods
  // ============================================================================

  /**
   * Get user's roles in a tenant
   *
   * @param tenantOrg - Tenant organization name
   * @param userId - User ID
   * @returns Array of role names the user has
   */
  async getUserRoles(tenantOrg: string, userId: string): Promise<string[]> {
    try {
      const roles = await this.getRoles(tenantOrg);
      return roles
        .filter((role) => role.users?.includes(`${tenantOrg}/${userId}`))
        .map((role) => role.name);
    } catch (error) {
      console.error("[AuthorizationRepository] getUserRoles error:", error);
      return [];
    }
  }

  /**
   * Attach user to a role in a tenant
   *
   * @param tenantOrg - Tenant organization name
   * @param userId - User ID
   * @param roleName - Simple role name
   */
  async attachUserRole(
    tenantOrg: string,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    try {
      const role = await this.getRole(tenantOrg, roleName);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${roleName} not found in ${tenantOrg}`);
        return false;
      }

      const userFullName = `${tenantOrg}/${userId}`;

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
   * Detach user from a role in a tenant
   *
   * @param tenantOrg - Tenant organization name
   * @param userId - User ID
   * @param roleName - Simple role name
   */
  async detachUserRole(
    tenantOrg: string,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    try {
      const role = await this.getRole(tenantOrg, roleName);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${roleName} not found in ${tenantOrg}`);
        return false;
      }

      const userFullName = `${tenantOrg}/${userId}`;

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
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name
   * @param resource - Resource type
   * @param actions - Array of actions
   * @param effect - Allow or Deny
   */
  async createPermission(
    tenantOrg: string,
    roleName: string,
    resource: string,
    actions: string[],
    effect: "Allow" | "Deny" = "Allow"
  ): Promise<boolean> {
    // Simple permission name without projectId prefix
    const permissionName = `${PERMISSION_PREFIX}-${roleName}-${resource}-${effect.toLowerCase()}`;

    const permission: Permission = {
      owner: tenantOrg,
      name: permissionName,
      createdTime: new Date().toISOString(),
      displayName: `${roleName} - ${resource}`,
      description: `${effect} ${actions.join(", ")} on ${resource}`,
      roles: [`${tenantOrg}/${roleName}`],
      domains: [], // No domains needed - isolation via tenant org
      model: `${tenantOrg}/${CASBIN_MODEL_NAME}`,
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
   *
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name
   */
  async getRolePermissions(
    tenantOrg: string,
    roleName: string
  ): Promise<Permission[]> {
    try {
      const response = await this.client.sdk.getPermissions();
      const allPermissions = (response.data as any)?.data ?? [];

      // Filter permissions for this role in the tenant
      const roleFullName = `${tenantOrg}/${roleName}`;
      return allPermissions.filter(
        (perm: Permission) =>
          perm.owner === tenantOrg &&
          perm.roles?.includes(roleFullName)
      );
    } catch (error) {
      console.error("[AuthorizationRepository] getRolePermissions error:", error);
      return [];
    }
  }

  /**
   * Delete a permission
   *
   * @param tenantOrg - Tenant organization name
   * @param permissionName - Permission name
   */
  async deletePermission(tenantOrg: string, permissionName: string): Promise<boolean> {
    try {
      const response = await this.client.sdk.deletePermission({
        owner: tenantOrg,
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
   *
   * @param tenantOrg - Tenant organization name
   * @param roleName - Simple role name
   * @param permissions - New permissions array
   */
  async updateRolePermissions(
    tenantOrg: string,
    roleName: string,
    permissions: Array<{
      resource: string;
      actions: string[];
      effect: "Allow" | "Deny";
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing permissions
      const existingPermissions = await this.getRolePermissions(tenantOrg, roleName);

      // Delete all existing permissions
      for (const perm of existingPermissions) {
        const deleted = await this.deletePermission(tenantOrg, perm.name);
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
          tenantOrg,
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
  // Role Hierarchy
  // ============================================================================

  /**
   * Role hierarchy definition
   * Each entry: [parentRole, childRole] means parentRole includes childRole
   *
   * In Casdoor, role.roles[] contains SUB-roles (children), not parent roles.
   * So owner.roles = [admin], admin.roles = [manager], etc.
   *
   * Hierarchy: owner > admin > manager > support > viewer
   */
  private static readonly ROLE_HIERARCHY: Array<[string, string]> = [
    ["owner", "admin"],
    ["admin", "manager"],
    ["manager", "support"],
    ["support", "viewer"],
  ];

  /**
   * Provision role hierarchy for a tenant
   * Sets up inheritance: owner > admin > manager > support > viewer
   *
   * @param tenantOrg - Tenant organization name
   */
  async provisionRoleHierarchy(
    tenantOrg: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      for (const [parentRole, childRole] of AuthorizationRepository.ROLE_HIERARCHY) {
        const updated = await this.addChildRole(tenantOrg, parentRole, childRole);
        if (!updated) {
          return {
            success: false,
            error: `Failed to add ${childRole} as sub-role of ${parentRole}`,
          };
        }
      }
      return { success: true };
    } catch (error) {
      console.error("[AuthorizationRepository] provisionRoleHierarchy error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Add a child role to a parent role (role inheritance)
   *
   * In Casdoor, role.roles[] contains sub-roles that the role includes.
   * E.g., owner.roles = ["org/admin"] means owner includes admin's permissions.
   *
   * @param tenantOrg - Tenant organization name
   * @param parentRole - Role that will include the child
   * @param childRole - Role to be included
   */
  async addChildRole(
    tenantOrg: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    try {
      const role = await this.getRole(tenantOrg, parentRole);
      if (!role) {
        console.error(`[AuthorizationRepository] Role ${parentRole} not found in ${tenantOrg}`);
        return false;
      }

      // Add child role to the roles array (sub-roles in Casdoor)
      const childRoleId = `${tenantOrg}/${childRole}`;
      const currentRoles = role.roles ?? [];

      // Avoid duplicates
      if (currentRoles.includes(childRoleId)) {
        return true; // Already has this child
      }

      const updatedRole: Role = {
        ...role,
        roles: [...currentRoles, childRoleId],
      };

      const response = await this.client.sdk.updateRole(updatedRole);
      const data = response.data as any;
      return data?.status === "ok";
    } catch (error) {
      console.error("[AuthorizationRepository] addChildRole error:", error);
      return false;
    }
  }

  // ============================================================================
  // Tenant Provisioning
  // ============================================================================

  /**
   * Provision all predefined roles and permissions for a new tenant
   *
   * @param tenantOrg - Tenant organization name (e.g., "org-project-a")
   * @param ownerId - User ID of the tenant owner
   */
  async provisionTenantRoles(
    tenantOrg: string,
    ownerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create all predefined roles with simple names
      for (const roleName of Object.values(PREDEFINED_ROLES)) {
        const displayName = ROLE_DISPLAY_NAMES[roleName];
        const description = ROLE_DESCRIPTIONS[roleName];

        const created = await this.createRole(
          tenantOrg,
          roleName, // Simple name: "owner", "admin", etc.
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
            tenantOrg,
            roleName, // Simple name
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
              tenantOrg,
              roleName, // Simple name
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

      // Attach owner role to the tenant creator
      const attached = await this.attachUserRole(
        tenantOrg,
        ownerId,
        PREDEFINED_ROLES.OWNER // Simple name: "owner"
      );

      if (!attached) {
        return {
          success: false,
          error: `Failed to attach owner role to user: ${ownerId}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("[AuthorizationRepository] provisionTenantRoles error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Deprovision all roles and permissions for a tenant
   *
   * @param tenantOrg - Tenant organization name
   */
  async deprovisionTenantRoles(tenantOrg: string): Promise<boolean> {
    try {
      // Get all roles for this tenant
      const roles = await this.getRoles(tenantOrg);

      // Delete each role and its permissions
      for (const role of roles) {
        // Delete permissions first
        const permissions = await this.getRolePermissions(tenantOrg, role.name);
        for (const perm of permissions) {
          await this.deletePermission(tenantOrg, perm.name);
        }
        // Delete the role
        await this.deleteRole(tenantOrg, role.name);
      }

      return true;
    } catch (error) {
      console.error("[AuthorizationRepository] deprovisionTenantRoles error:", error);
      return false;
    }
  }
}
