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
      const organizationId = ctx.organizationId!;
      const result = await ctx.kernel.runScript(CreateRoleScript, {
        organizationId,
        domain: input.domain ?? "*",
        name: input.name,
        displayName: input.displayName,
        description: input.description ?? undefined,
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
      const organizationId = ctx.organizationId!;
      const result = await ctx.kernel.runScript(UpdateRoleScript, {
        organizationId,
        domain: input.domain ?? "*",
        roleName: input.name,
        displayName: input.displayName ?? undefined,
        description: input.description ?? undefined,
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
      const organizationId = ctx.organizationId!;
      const result = await ctx.kernel.runScript(DeleteRoleScript, {
        organizationId,
        domain: input.domain ?? "*",
        roleName: input.name,
      });

      return {
        deletedRoleName: result.deleted ? input.name : null,
        userErrors: result.userErrors,
      };
    },
  },
};
