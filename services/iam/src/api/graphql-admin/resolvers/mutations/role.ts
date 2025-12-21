import type {
  Resolvers,
  PermissionEffect as GqlPermissionEffect,
  Role,
  RolePermission,
} from "../../generated/types.js";
import { PermissionEffect } from "../../generated/types.js";
import {
  CreateRoleScript,
  UpdateRoleScript,
  DeleteRoleScript,
  AttachUserRoleScript,
  DetachUserRoleScript,
} from "../../../../scripts/authorization/index.js";
import type { RoleInfo, RolePermission as DtoRolePermission } from "../../../../scripts/authorization/dto/index.js";

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
 * Map GraphQL PermissionEffect to DTO effect
 */
function mapEffectToDto(effect: GqlPermissionEffect): "Allow" | "Deny" {
  return effect === PermissionEffect.Allow ? "Allow" : "Deny";
}

export const roleMutationResolvers: Partial<Resolvers> = {
  Mutation: {
    roleMutation: () => ({}) as any,
  },

  RoleMutation: {
    roleCreate: async (_parent, { input }, ctx) => {
      // Get tenantId from context (project's Casdoor org)
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return {
          role: null,
          userErrors: [
            {
              code: "NO_PROJECT_CONTEXT",
              message: "No project context. Please provide X-Project-Name header.",
            },
          ],
        };
      }

      const result = await ctx.kernel.runScript(CreateRoleScript, {
        tenantId,
        name: input.name,
        displayName: input.displayName,
        description: input.description ?? undefined,
        inherits: input.inherits ?? undefined,
        permissions: input.permissions.map((p) => ({
          resource: p.resource,
          actions: p.actions,
          effect: mapEffectToDto(p.effect),
        })),
      });

      return {
        role: result.role ? mapRoleInfoToRole(result.role) : null,
        userErrors: result.userErrors,
      };
    },

    roleUpdate: async (_parent, { input }, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return {
          role: null,
          userErrors: [
            {
              code: "NO_PROJECT_CONTEXT",
              message: "No project context. Please provide X-Project-Name header.",
            },
          ],
        };
      }

      const result = await ctx.kernel.runScript(UpdateRoleScript, {
        tenantId,
        roleName: input.name,
        displayName: input.displayName ?? undefined,
        description: input.description ?? undefined,
        inherits: input.inherits ?? undefined,
        permissions: input.permissions?.map((p) => ({
          resource: p.resource,
          actions: p.actions,
          effect: mapEffectToDto(p.effect),
        })),
      });

      return {
        role: result.role ? mapRoleInfoToRole(result.role) : null,
        userErrors: result.userErrors,
      };
    },

    roleDelete: async (_parent, { input }, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return {
          deletedRoleName: null,
          userErrors: [
            {
              code: "NO_PROJECT_CONTEXT",
              message: "No project context. Please provide X-Project-Name header.",
            },
          ],
        };
      }

      const result = await ctx.kernel.runScript(DeleteRoleScript, {
        tenantId,
        roleName: input.name,
      });

      return {
        deletedRoleName: result.deleted ? input.name : null,
        userErrors: result.userErrors,
      };
    },

    projectMemberRoleChange: async (_parent, { input }, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return {
          member: null,
          userErrors: [
            {
              code: "NO_PROJECT_CONTEXT",
              message: "No project context. Please provide X-Project-Name header.",
            },
          ],
        };
      }

      const currentUserId = ctx.currentUser?.id;
      if (!currentUserId) {
        return {
          member: null,
          userErrors: [
            {
              code: "UNAUTHENTICATED",
              message: "You must be logged in to change member roles.",
            },
          ],
        };
      }

      // First, detach current role (if any)
      await ctx.kernel.runScript(DetachUserRoleScript, {
        userId: input.userId,
        tenantId,
        revokedBy: currentUserId,
      });

      // Then attach new role
      const attachResult = await ctx.kernel.runScript(AttachUserRoleScript, {
        userId: input.userId,
        tenantId,
        roleName: input.newRole,
        grantedBy: currentUserId,
      });

      if (!attachResult.attached) {
        return {
          member: null,
          userErrors: attachResult.userErrors,
        };
      }

      // Return member info (simplified - in real implementation, fetch full member data)
      return {
        member: {
          id: input.userId,
          user: { id: input.userId } as any,
          role: { name: input.newRole } as any,
          grantedAt: new Date().toISOString(),
          grantedBy: null,
        },
        userErrors: [],
      };
    },

    projectMemberRemove: async (_parent, { input }, ctx) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        return {
          removedUserId: null,
          userErrors: [
            {
              code: "NO_PROJECT_CONTEXT",
              message: "No project context. Please provide X-Project-Name header.",
            },
          ],
        };
      }

      const currentUserId = ctx.currentUser?.id;
      if (!currentUserId) {
        return {
          removedUserId: null,
          userErrors: [
            {
              code: "UNAUTHENTICATED",
              message: "You must be logged in to remove members.",
            },
          ],
        };
      }

      const result = await ctx.kernel.runScript(DetachUserRoleScript, {
        userId: input.userId,
        tenantId,
        revokedBy: currentUserId,
      });

      return {
        removedUserId: result.detached ? input.userId : null,
        userErrors: result.userErrors,
      };
    },
  },
};
