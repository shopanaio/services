import type {
  Resolvers,
  Role,
  RolePermission,
  ProjectMember,
} from "../generated/types.js";
import { PermissionEffect } from "../generated/types.js";
import {
  ListRolesScript,
  GetUserRoleScript,
  AuthorizeScript,
} from "../../../scripts/authorization/index.js";
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
  // Extend User type with role
  User: {
    /**
     * Resolve user's role in current organization/project context.
     */
    role: async (parent, _args, ctx) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return null;
      }

      const userId = parent.id;
      if (!userId) {
        return null;
      }

      const result = await ctx.kernel.runScript(GetUserRoleScript, {
        userId,
        organizationId,
        projectId: ctx.projectSlug ?? undefined,
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
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return {
          allowed: false,
          deniedReason:
            "No organization context. Please provide valid JWT with org claim.",
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
        organizationId,
        projectId: ctx.projectSlug ?? undefined,
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
