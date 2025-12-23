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
import { ListResourcesScript } from "../../../scripts/resources/index.js";
import type {
  RoleInfo,
  RolePermission as DtoRolePermission,
} from "../../../scripts/authorization/dto/index.js";

/**
 * Map DTO RolePermission to GraphQL RolePermission
 */
function mapRolePermission(perm: DtoRolePermission): RolePermission {
  return {
    resource: perm.resource,
    actions: perm.actions,
    effect:
      perm.effect === "Allow" ? PermissionEffect.Allow : PermissionEffect.Deny,
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
    permissions: role.permissions.map(mapRolePermission),
    createdAt: role.createdAt?.toISOString(),
  };
}


export const roleResolvers: Partial<Resolvers> = {
  // Extend Project type from project-service
  Project: {
    /**
     * Get all roles for the project.
     */
    roles: async (_parent, _args, ctx) => {
      // ctx.tenantId is resolved from X-Project-Name header via contextMiddleware
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
     * Get available resources for role editor.
     * Dynamically fetches from all services via broker.
     */
    availableResources: async (_parent, _args, ctx) => {
      const result = await ctx.kernel.runScript(ListResourcesScript, {});

      if (result.userErrors.length > 0) {
        console.warn("[Project.availableResources] Partial failure:", result.userErrors);
      }

      // Map to GraphQL ResourceDefinition format
      return result.resources.map((r): ResourceDefinition => ({
        service: r.service,
        name: r.name,
        displayName: r.displayName,
        actions: r.actions,
      }));
    },

    /**
     * Get project team members with roles.
     */
    members: async (_parent, _args, ctx) => {
      // ctx.tenantId is resolved from X-Project-Name header via contextMiddleware
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        console.error("[Project.members] No tenantId in context");
        return [];
      }

      // Get members and roles in parallel
      const [membersResult, rolesResult] = await Promise.all([
        ctx.kernel.runScript(ListTenantMembersScript, { tenantId }),
        ctx.kernel.runScript(ListRolesScript, { tenantId }),
      ]);

      if (membersResult.userErrors.length > 0) {
        console.error("[Project.members] Error:", membersResult.userErrors);
        return [];
      }

      // Collect all user IDs (members + grantedBy)
      const userIds = new Set<string>();
      for (const member of membersResult.members) {
        userIds.add(member.userId);
        if (member.grantedBy) {
          userIds.add(member.grantedBy);
        }
      }

      // Batch load all users
      const usersMap = await ctx.kernel.repository.user.findByIds(
        Array.from(userIds)
      );

      // Create a map of role name -> RoleInfo for quick lookup
      const rolesMap = new Map<string, RoleInfo>();
      for (const role of rolesResult.roles) {
        rolesMap.set(role.name, role);
      }

      return membersResult.members.map((member) => {
        const roleInfo = rolesMap.get(member.role);
        const user = usersMap.get(member.userId);
        const grantedByUser = member.grantedBy
          ? usersMap.get(member.grantedBy)
          : null;

        return {
          id: member.userId,
          user: {
            id: member.userId,
            email: user?.email ?? "",
            firstName: user?.name?.split(" ")[0] ?? null,
            lastName: user?.name?.split(" ").slice(1).join(" ") ?? null,
            avatar: user?.image ?? null,
          },
          role: roleInfo
            ? mapRoleInfoToRole(roleInfo)
            : {
                name: member.role,
                displayName: member.role,
                isSystem: false,
                permissions: [],
              },
          grantedAt: member.grantedAt?.toISOString(),
          grantedBy: grantedByUser
            ? {
                id: grantedByUser.id,
                email: grantedByUser.email,
                firstName: grantedByUser.name?.split(" ")[0] ?? null,
                lastName: grantedByUser.name?.split(" ").slice(1).join(" ") ?? null,
                avatar: grantedByUser.image ?? null,
              }
            : null,
        } as ProjectMember;
      });
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
          deniedReason:
            "No project context. Please provide X-Project-Name header.",
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

  // ProjectMember type resolvers
  ProjectMember: {
    user: (parent) => {
      // Return federation reference - gateway will resolve User fields
      return {
        id: parent.user.id,
        email: parent.user.email,
      };
    },
    role: (parent) => {
      // Role is already resolved in parent
      return parent.role;
    },
    grantedBy: (parent) => {
      if (!parent.grantedBy) return null;
      // Return federation reference - gateway will resolve full User
      const grantedById =
        typeof parent.grantedBy === "string"
          ? parent.grantedBy
          : parent.grantedBy.id;
      return {
        id: grantedById,
        email: "",
      };
    },
  } as Resolvers["ProjectMember"],
};
