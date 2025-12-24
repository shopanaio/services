import type {
  Resolvers,
  Role,
  RolePermission,
  User,
} from "../generated/types.js";
import { PermissionEffect } from "../generated/types.js";
import type { ServiceContext } from "../../../context/index.js";
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
    id: role.id ?? role.name, // Use name as fallback for system roles
    domain: role.domain ?? "*",
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
    role: async (
      parent: User,
      _args: Record<string, never>,
      ctx: ServiceContext
    ) => {
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
        resource: input.resource,
        action: input.action,
      });

      return {
        allowed: result.allowed,
        deniedReason: result.deniedReason,
      };
    },
  },

  // Role type resolver for federation
  Role: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext
    ): Promise<Role | null> => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return null;
      }

      // Get all roles and find by id (or name for system roles)
      const result = await ctx.kernel.runScript(ListRolesScript, {
        organizationId,
      });

      if (result.userErrors.length > 0) {
        console.error("[Role.__resolveReference] Error:", result.userErrors);
        return null;
      }

      // Try to find by id first, then by name (for system roles)
      const role = result.roles.find((r) => r.id === reference.id || r.name === reference.id);
      if (!role) {
        return null;
      }

      return mapRoleInfoToRole(role);
    },
  },
};
