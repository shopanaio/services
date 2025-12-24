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
  ListRolesScript,
  AuthorizeScript,
} from "../../../../scripts/authorization/index.js";
import type { RoleInfo, RolePermission as DtoRolePermission } from "../../../../scripts/authorization/dto/index.js";
import type { ServiceContext } from "../../../../context/index.js";

interface AuthError {
  code: string;
  message: string;
}

/**
 * Check if user has permission to perform action on resource
 * Returns null if authorized, error object if denied
 */
async function checkAuthorization(
  ctx: ServiceContext,
  resource: string,
  action: string
): Promise<AuthError | null> {
  const userId = ctx.currentUser?.id;
  const organizationId = ctx.organizationId;

  if (!userId) {
    return {
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    };
  }

  if (!organizationId) {
    return {
      code: "NO_ORG_CONTEXT",
      message: "Organization context required. Use switchOrganization mutation to set org in JWT.",
    };
  }

  const result = await ctx.kernel.runScript(AuthorizeScript, {
    userId,
    organizationId,
    resource,
    action,
  });

  if (!result.allowed) {
    return {
      code: "FORBIDDEN",
      message: `Access denied: ${resource}:${action}`,
    };
  }

  return null;
}

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
      // Check authorization
      const authError = await checkAuthorization(ctx, "role", "create");
      if (authError) {
        return { role: null, userErrors: [authError] };
      }

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
      // Check authorization
      const authError = await checkAuthorization(ctx, "role", "update");
      if (authError) {
        return { role: null, userErrors: [authError] };
      }

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
      // Check authorization
      const authError = await checkAuthorization(ctx, "role", "delete");
      if (authError) {
        return { deletedRoleName: null, userErrors: [authError] };
      }

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

    projectMemberRoleChange: async (_parent, { input }, ctx) => {
      // Check authorization for member management
      const authError = await checkAuthorization(ctx, "member", "update");
      if (authError) {
        return { member: null, userErrors: [authError] };
      }

      const organizationId = ctx.organizationId!;
      const currentUserId = ctx.currentUser!.id;

      // Cannot change own role
      if (input.userId === currentUserId) {
        return {
          member: null,
          userErrors: [{ code: "CANNOT_CHANGE_OWN_ROLE", message: "Cannot change your own role." }],
        };
      }

      // Check if trying to assign owner role - only owner can do this
      if (input.newRole === "owner") {
        // Get current user's role
        const currentUserRole = await ctx.kernel.repository.authorization.getUserRole(organizationId, currentUserId);
        if (currentUserRole?.name !== "owner") {
          return {
            member: null,
            userErrors: [{ code: "CANNOT_ASSIGN_OWNER", message: "Only owner can assign owner role." }],
          };
        }
      }

      // First, detach current role (if any)
      await ctx.kernel.runScript(DetachUserRoleScript, {
        userId: input.userId,
        organizationId,
        revokedBy: currentUserId,
      });

      // Then attach new role
      const attachResult = await ctx.kernel.runScript(AttachUserRoleScript, {
        userId: input.userId,
        organizationId,
        roleName: input.newRole,
        grantedBy: currentUserId,
      });

      if (!attachResult.attached) {
        return {
          member: null,
          userErrors: attachResult.userErrors,
        };
      }

      // Fetch user data to include in response (required for non-nullable fields)
      const user = await ctx.kernel.repository.user.findById(input.userId);
      if (!user) {
        return {
          member: null,
          userErrors: [{ code: "USER_NOT_FOUND", message: "User not found." }],
        };
      }

      // Fetch role info to include full role data
      const rolesResult = await ctx.kernel.runScript(ListRolesScript, { organizationId });
      const roleInfo = rolesResult.roles.find((r) => r.name === input.newRole);
      if (!roleInfo) {
        return {
          member: null,
          userErrors: [{ code: "ROLE_NOT_FOUND", message: `Role "${input.newRole}" not found.` }],
        };
      }

      // Return member info with full user and role data
      return {
        member: {
          id: input.userId,
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            firstName: user.name?.split(" ")[0] ?? null,
            lastName: user.name?.split(" ").slice(1).join(" ") ?? null,
            avatar: user.image,
            locale: null,
            isAdmin: false,
            isForbidden: false,
            isDeleted: false,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: input.newRole,
          } as any,
          role: mapRoleInfoToRole(roleInfo),
          grantedAt: new Date().toISOString(),
          grantedBy: null,
        },
        userErrors: [],
      };
    },

    projectMemberRemove: async (_parent, { input }, ctx) => {
      // Check authorization for member management
      const authError = await checkAuthorization(ctx, "member", "delete");
      if (authError) {
        return { removedUserId: null, userErrors: [authError] };
      }

      const organizationId = ctx.organizationId!;
      const currentUserId = ctx.currentUser!.id;

      // Cannot remove self
      if (input.userId === currentUserId) {
        return {
          removedUserId: null,
          userErrors: [{ code: "CANNOT_REMOVE_SELF", message: "Cannot remove yourself." }],
        };
      }

      // Cannot remove owner
      const targetUserRole = await ctx.kernel.repository.authorization.getUserRole(organizationId, input.userId);
      if (targetUserRole?.name === "owner") {
        return {
          removedUserId: null,
          userErrors: [{ code: "CANNOT_REMOVE_OWNER", message: "Cannot remove organization owner." }],
        };
      }

      const result = await ctx.kernel.runScript(DetachUserRoleScript, {
        userId: input.userId,
        organizationId,
        revokedBy: currentUserId,
      });

      return {
        removedUserId: result.detached ? input.userId : null,
        userErrors: result.userErrors,
      };
    },
  },
};
