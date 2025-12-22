import type {
  Resolvers,
  Role,
  RolePermission,
  ProjectMember,
  ResourceDefinition,
} from "../generated/types.js";
import { PermissionEffect } from "../generated/types.js";
import {
  ListRolesScript,
  GetUserRoleScript,
  AuthorizeScript,
  ListTenantMembersScript,
} from "../../../scripts/authorization/index.js";
// Note: ListRolesScript is used in Project.roles resolver
// AuthorizeScript is used in Query.authorize resolver
import type { RoleInfo, RolePermission as DtoRolePermission } from "../../../scripts/authorization/dto/index.js";

/**
 * Map DTO RolePermission to GraphQL RolePermission
 */
function mapRolePermission(perm: DtoRolePermission): RolePermission {
  return {
    resource: perm.resource,
    actions: perm.actions,
    effect: perm.effect === "Allow" ? PermissionEffect.Allow : PermissionEffect.Deny,
  };
}

/**
 * Map RoleInfo DTO to GraphQL Role
 */
function mapRoleInfoToRole(role: RoleInfo): Role {
  return {
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    isSystem: role.isSystem,
    inherits: role.inherits,
    permissions: role.permissions.map(mapRolePermission),
    createdAt: role.createdAt?.toISOString(),
  };
}

/**
 * Available resources for role editor.
 * This is a static list of resources available in the system.
 * In a full implementation, this could be dynamically fetched from each service.
 */
const AVAILABLE_RESOURCES: ResourceDefinition[] = [
  // Inventory service
  {
    service: "inventory",
    name: "product",
    actions: ["create", "read", "update", "delete", "publish"],
    displayName: "Products",
  },
  {
    service: "inventory",
    name: "category",
    actions: ["create", "read", "update", "delete"],
    displayName: "Categories",
  },
  {
    service: "inventory",
    name: "collection",
    actions: ["create", "read", "update", "delete"],
    displayName: "Collections",
  },
  // Media service
  {
    service: "media",
    name: "media",
    actions: ["upload", "read", "delete"],
    displayName: "Media",
  },
  // Orders service
  {
    service: "orders",
    name: "order",
    actions: ["read", "update", "fulfill", "cancel", "refund"],
    displayName: "Orders",
  },
  {
    service: "orders",
    name: "customer",
    actions: ["read", "update", "delete"],
    displayName: "Customers",
  },
  // Project service
  {
    service: "project",
    name: "project",
    actions: ["read", "update", "delete"],
    displayName: "Project Settings",
  },
  {
    service: "project",
    name: "project/team",
    actions: ["read", "write", "remove"],
    displayName: "Team Management",
  },
  {
    service: "project",
    name: "project/billing",
    actions: ["read", "update"],
    displayName: "Billing",
  },
  {
    service: "project",
    name: "project/apiKey",
    actions: ["create", "read", "revoke", "delete"],
    displayName: "API Keys",
  },
  // Pricing service
  {
    service: "pricing",
    name: "priceList",
    actions: ["create", "read", "update", "delete"],
    displayName: "Price Lists",
  },
  {
    service: "pricing",
    name: "discount",
    actions: ["create", "read", "update", "delete"],
    displayName: "Discounts",
  },
];

export const roleResolvers: Partial<Resolvers> = {
  // Extend Project type with roles, members, availableResources
  Project: {
    /**
     * Federation resolver for Project entity.
     * Resolves tenantId from project ID and attaches to context for field resolvers.
     */
    __resolveReference: async (reference: { id: string }, ctx: ServiceContext) => {
      console.log("[Project.__resolveReference] id:", reference.id, "existing tenantId:", ctx.tenantId);

      // Always try to resolve tenantId from project service for federation requests
      try {
        const broker = ctx.kernel.getServices().broker;
        console.log("[Project.__resolveReference] Calling project.getProjectById...");
        const result = await broker.call<{ id: string }, { project?: { integrations: { iam?: { config: { tenantId: string } } } }; userErrors: any[] }>(
          "project.getProjectById",
          { id: reference.id }
        );
        console.log("[Project.__resolveReference] Result:", JSON.stringify(result));

        if (result.project?.integrations?.iam?.config?.tenantId) {
          // Mutate context to set tenantId for field resolvers
          (ctx as any).tenantId = result.project.integrations.iam.config.tenantId;
          console.log("[Project.__resolveReference] Set tenantId:", ctx.tenantId);
        } else {
          console.warn("[Project.__resolveReference] No tenantId in project result");
        }
      } catch (error) {
        console.error("[Project.__resolveReference] Error resolving tenantId:", error);
      }

      return { id: reference.id };
    },

    /**
     * Resolve roles for a project.
     * Uses the project ID to get the tenant org name.
     */
    roles: async (_parent, _args, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        console.error("[Project.roles] No tenantId in context");
        return [];
      }

      const result = await ctx.kernel.runScript(ListRolesScript, {
        tenantId,
      });

      if (result.userErrors.length > 0) {
        console.error("[Project.roles] Error:", result.userErrors);
        return [];
      }

      return result.roles.map(mapRoleInfoToRole);
    },

    /**
     * Resolve available resources for role editor.
     */
    availableResources: async (_parent, _args, _ctx) => {
      // Return static list of resources
      // In a full implementation, this could query each service for its resources
      return AVAILABLE_RESOURCES;
    },

    /**
     * Resolve project members with roles.
     */
    members: async (_parent, _args, ctx): Promise<ProjectMember[]> => {
      try {
        const tenantId = ctx.tenantId;
        console.log("[Project.members] tenantId:", tenantId);
        if (!tenantId) {
          console.error("[Project.members] No tenantId in context");
          return [];
        }

        // Get all members with their roles
        const membersResult = await ctx.kernel.runScript(ListTenantMembersScript, {
          tenantId,
        });

        console.log("[Project.members] membersResult:", JSON.stringify(membersResult));

        if (membersResult.userErrors.length > 0) {
          console.error("[Project.members] Error:", membersResult.userErrors);
          return [];
        }

        // Get all roles for role details
        const rolesResult = await ctx.kernel.runScript(ListRolesScript, {
          tenantId,
        });

        const rolesMap = new Map(
          rolesResult.roles.map((r) => [r.name, mapRoleInfoToRole(r)])
        );

        // Map members to ProjectMember type
        const members: ProjectMember[] = membersResult.members.map((m) => ({
          id: m.userId,
          user: { id: m.userId } as any, // Will be resolved by User resolver via federation
          role: rolesMap.get(m.role) ?? {
            name: m.role,
            displayName: m.role,
            isSystem: false,
            inherits: [],
            permissions: [],
          },
          grantedAt: m.grantedAt?.toISOString() ?? null,
          grantedBy: m.grantedBy ? { id: m.grantedBy } as any : null,
        }));

        console.log("[Project.members] Returning members:", members.length);
        return members;
      } catch (error) {
        console.error("[Project.members] Exception:", error);
        throw error;
      }
    },
  },

  // Extend User type with role
  User: {
    /**
     * Resolve user's role in current project context.
     */
    role: async (parent, _args, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return null;
      }

      const userId = parent.id;
      if (!userId) {
        return null;
      }

      const result = await ctx.kernel.runScript(GetUserRoleScript, {
        userId,
        tenantId,
      });

      if (result.userErrors.length > 0) {
        console.error("[User.role] Error:", result.userErrors);
        return null;
      }

      return result.role;
    },
  },

  // Query.authorize
  Query: {
    authorize: async (_parent, { input }, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return {
          allowed: false,
          deniedReason: "No project context. Please provide X-Project-Name header.",
        };
      }

      const userId = ctx.currentUser?.id;
      if (!userId) {
        return {
          allowed: false,
          deniedReason: "User not authenticated.",
        };
      }

      const result = await ctx.kernel.runScript(AuthorizeScript, {
        userId,
        tenantId,
        resource: input.resource,
        action: input.action,
      });

      return {
        allowed: result.allowed,
        deniedReason: result.deniedReason,
      };
    },
  },
};
