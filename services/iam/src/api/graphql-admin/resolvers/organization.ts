import type {
  Resolvers,
  Organization,
  Member,
  Membership,
  ChangeRoleInput,
  RemoveAccessInput,
} from "../generated/types.js";
import type { ServiceContext } from "../../../context/index.js";

/**
 * Map organization DB entity to GraphQL type
 */
function mapOrganization(org: {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}): Partial<Organization> {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt?.toISOString(),
  };
}

export const organizationResolvers: Partial<Resolvers> = {
  Query: {
    /**
     * Get organization by ID (if user has access)
     */
    organization: async (_parent, { id }, ctx) => {
      const userId = ctx.currentUser?.id;
      if (!userId) {
        return null;
      }

      const hasAccess = await ctx.kernel.repository.organization.userHasAccessToOrg(userId, id);
      if (!hasAccess) {
        return null;
      }

      const org = await ctx.kernel.repository.organization.findById(id);
      if (!org) {
        return null;
      }

      return mapOrganization(org);
    },

    /**
     * Get current organization context (from JWT)
     */
    currentOrganization: async (_parent, _args, ctx) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return null;
      }

      const org = await ctx.kernel.repository.organization.findById(organizationId);
      if (!org) {
        return null;
      }

      return mapOrganization(org);
    },
  },

  Mutation: {
    organizationMutation: () => ({}),
  },

  OrganizationMutation: {
    /**
     * Create a new organization
     */
    createOrganization: async (_parent, { input }, ctx) => {
      const userId = ctx.currentUser?.id;
      if (!userId) {
        return {
          organization: null,
          userErrors: [{ message: "User not authenticated", code: "UNAUTHENTICATED" }],
        };
      }

      // Check if slug is already taken
      const existing = await ctx.kernel.repository.organization.findBySlug(input.slug);
      if (existing) {
        return {
          organization: null,
          userErrors: [{ message: "Organization slug already exists", code: "SLUG_TAKEN", field: ["slug"] }],
        };
      }

      // Create organization
      const org = await ctx.kernel.repository.organization.create({
        name: input.name,
        slug: input.slug,
      });

      // Add current user as owner in organization_member table
      await ctx.kernel.repository.organization.addMember({
        organizationId: org.id,
        userId,
        orgRole: "owner",
      });

      // Assign owner role in Casbin (domain = orgId for org-level)
      const casbin = ctx.kernel.repository.casbin;
      await casbin.assignRoleSimple(org.id, userId, "owner", org.id);

      return {
        organization: mapOrganization(org),
        userErrors: [],
      };
    },

    /**
     * Update organization
     */
    updateOrganization: async (_parent, { input }, ctx) => {
      const userId = ctx.currentUser?.id;
      const organizationId = ctx.organizationId;

      if (!userId || !organizationId) {
        return {
          organization: null,
          userErrors: [{ message: "Organization context required", code: "NO_ORG_CONTEXT" }],
        };
      }

      const isAdmin = await ctx.kernel.repository.organization.isAdmin(userId, organizationId);
      if (!isAdmin) {
        return {
          organization: null,
          userErrors: [{ message: "Admin access required", code: "FORBIDDEN" }],
        };
      }

      const org = await ctx.kernel.repository.organization.update(organizationId, {
        name: input.name ?? undefined,
      });

      if (!org) {
        return {
          organization: null,
          userErrors: [{ message: "Organization not found", code: "NOT_FOUND" }],
        };
      }

      return {
        organization: mapOrganization(org),
        userErrors: [],
      };
    },

    /**
     * Delete organization (owner only)
     */
    deleteOrganization: async (_parent, _args, ctx) => {
      const userId = ctx.currentUser?.id;
      const organizationId = ctx.organizationId;

      if (!userId || !organizationId) {
        return {
          deletedOrganizationId: null,
          userErrors: [{ message: "Organization context required", code: "NO_ORG_CONTEXT" }],
        };
      }

      const isOwner = await ctx.kernel.repository.organization.isOwner(userId, organizationId);
      if (!isOwner) {
        return {
          deletedOrganizationId: null,
          userErrors: [{ message: "Owner access required", code: "FORBIDDEN" }],
        };
      }

      await ctx.kernel.repository.organization.softDelete(organizationId);

      return {
        deletedOrganizationId: organizationId,
        userErrors: [],
      };
    },

    /**
     * Invite member to organization with role assignments
     */
    inviteMember: async (_parent, { input }, ctx) => {
      const userId = ctx.currentUser?.id;
      const organizationId = ctx.organizationId;

      if (!userId || !organizationId) {
        return {
          member: null,
          userErrors: [{ message: "Organization context required", code: "NO_ORG_CONTEXT" }],
        };
      }

      const isAdmin = await ctx.kernel.repository.organization.isAdmin(userId, organizationId);
      if (!isAdmin) {
        return {
          member: null,
          userErrors: [{ message: "Admin access required", code: "FORBIDDEN" }],
        };
      }

      // Find user by email
      const invitedUser = await ctx.kernel.repository.user.findByEmail(input.email);
      if (!invitedUser) {
        return {
          member: null,
          userErrors: [{ message: "User not found", code: "USER_NOT_FOUND" }],
        };
      }

      // Check if already a member
      const existingMember = await ctx.kernel.repository.organization.findMember(
        organizationId,
        invitedUser.id
      );
      if (existingMember) {
        return {
          member: null,
          userErrors: [{ message: "User is already a member", code: "ALREADY_MEMBER" }],
        };
      }

      // Validate at least one role assignment
      if (!input.roles || input.roles.length === 0) {
        return {
          member: null,
          userErrors: [{ message: "At least one role assignment is required", code: "NO_ROLES" }],
        };
      }

      // Get first role to determine org-level role for organization_member table
      const firstOrgRole = input.roles.find(r => r.domain === organizationId);
      const orgRole = firstOrgRole?.role ?? "member";

      // Add member to organization_member table
      const member = await ctx.kernel.repository.organization.addMember({
        organizationId,
        userId: invitedUser.id,
        orgRole,
        invitedBy: userId,
      });

      // Assign all roles in Casbin
      const casbin = ctx.kernel.repository.casbin;
      for (const assignment of input.roles) {
        await casbin.assignRoleSimple(
          organizationId,
          invitedUser.id,
          assignment.role,
          assignment.domain
        );
      }

      return {
        member: {
          id: member.id,
          user: { __typename: "User", id: invitedUser.id } as any,
          role: orgRole,
          grantedAt: member.createdAt.toISOString(),
          grantedBy: { __typename: "User", id: userId } as any,
        },
        userErrors: [],
      };
    },

    /**
     * Remove member from organization
     */
    removeMember: async (_parent, { memberId }, ctx) => {
      const userId = ctx.currentUser?.id;
      const organizationId = ctx.organizationId;

      if (!userId || !organizationId) {
        return {
          removedMemberId: null,
          userErrors: [{ message: "Organization context required", code: "NO_ORG_CONTEXT" }],
        };
      }

      const isAdmin = await ctx.kernel.repository.organization.isAdmin(userId, organizationId);
      if (!isAdmin) {
        return {
          removedMemberId: null,
          userErrors: [{ message: "Admin access required", code: "FORBIDDEN" }],
        };
      }

      const member = await ctx.kernel.repository.organization.findMemberById(memberId);
      if (!member || member.organizationId !== organizationId) {
        return {
          removedMemberId: null,
          userErrors: [{ message: "Member not found", code: "NOT_FOUND" }],
        };
      }

      // Cannot remove self
      if (member.userId === userId) {
        return {
          removedMemberId: null,
          userErrors: [{ message: "Cannot remove yourself", code: "SELF_REMOVAL" }],
        };
      }

      // Cannot remove owner
      if (member.orgRole === "owner") {
        return {
          removedMemberId: null,
          userErrors: [{ message: "Cannot remove organization owner", code: "OWNER_REMOVAL" }],
        };
      }

      await ctx.kernel.repository.organization.removeMember(memberId);

      // Remove all casbin role assignments for this user in all domains
      const casbin = ctx.kernel.repository.casbin;
      const roles = await casbin.getRolesForUser(organizationId, member.userId);
      for (const { role, domain } of roles) {
        await casbin.removeRoleSimple(organizationId, member.userId, role, domain);
      }

      return {
        removedMemberId: memberId,
        userErrors: [],
      };
    },

    /**
     * Change role for a member in specific domain
     */
    changeRole: async (
      _parent: unknown,
      { input }: { input: ChangeRoleInput },
      ctx: ServiceContext
    ) => {
      const userId = ctx.currentUser?.id;
      const organizationId = ctx.organizationId;

      if (!userId || !organizationId) {
        return {
          member: null,
          userErrors: [{ message: "Organization context required", code: "NO_ORG_CONTEXT" }],
        };
      }

      const isAdmin = await ctx.kernel.repository.organization.isAdmin(userId, organizationId);
      if (!isAdmin) {
        return {
          member: null,
          userErrors: [{ message: "Admin access required", code: "FORBIDDEN" }],
        };
      }

      // Find member by userId
      const member = await ctx.kernel.repository.organization.findMember(
        organizationId,
        input.userId
      );
      if (!member) {
        return {
          member: null,
          userErrors: [{ message: "Member not found", code: "NOT_FOUND" }],
        };
      }

      // Update role in Casbin
      const casbin = ctx.kernel.repository.casbin;

      // Remove existing roles in this domain first
      await casbin.removeAllRolesInDomain(organizationId, input.userId, input.domain);

      // Assign new role
      await casbin.assignRoleSimple(organizationId, input.userId, input.role, input.domain);

      return {
        member: {
          id: member.id,
          user: { __typename: "User", id: input.userId } as any,
          role: input.role,
          grantedAt: member.createdAt.toISOString(),
          grantedBy: member.invitedBy ? { __typename: "User", id: member.invitedBy } as any : null,
        },
        userErrors: [],
      };
    },

    /**
     * Remove member's access from domain
     */
    removeAccess: async (
      _parent: unknown,
      { input }: { input: RemoveAccessInput },
      ctx: ServiceContext
    ) => {
      const userId = ctx.currentUser?.id;
      const organizationId = ctx.organizationId;

      if (!userId || !organizationId) {
        return {
          success: false,
          userErrors: [{ message: "Organization context required", code: "NO_ORG_CONTEXT" }],
        };
      }

      const isAdmin = await ctx.kernel.repository.organization.isAdmin(userId, organizationId);
      if (!isAdmin) {
        return {
          success: false,
          userErrors: [{ message: "Admin access required", code: "FORBIDDEN" }],
        };
      }

      // Remove all roles in this domain
      const casbin = ctx.kernel.repository.casbin;
      await casbin.removeAllRolesInDomain(organizationId, input.userId, input.domain);

      return {
        success: true,
        userErrors: [],
      };
    },
  },

  Organization: {
    /**
     * Return Federation reference for membership.
     * IAM resolves via Membership.__resolveReference.
     */
    membership: (org: Organization): Partial<Membership> => {
      return { domain: org.id };  // domain = orgId
    },
  },

  Member: {
    /**
     * Resolve Member by id for Federation.
     */
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext
    ): Promise<Member | null> => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return null;
      }

      // Find member by id in organization_member table
      const member = await ctx.kernel.repository.organization.findMemberById(reference.id);
      if (!member || member.organizationId !== organizationId) {
        return null;
      }

      // Get role from Casbin
      const casbin = ctx.kernel.repository.casbin;
      const roles = await casbin.getRolesForUser(organizationId, member.userId);
      const role = roles.length > 0 ? roles[0].role : "member";

      return {
        id: member.id,
        user: { __typename: "User", id: member.userId } as any,
        role,
        grantedAt: member.createdAt.toISOString(),
        grantedBy: member.invitedBy
          ? ({ __typename: "User", id: member.invitedBy } as any)
          : null,
      };
    },

    /**
     * Resolve user reference
     */
    user: (parent) => {
      const userId = (parent.user as any)?.id ?? parent.user;
      return { __typename: "User", id: userId } as any;
    },

    /**
     * Resolve grantedBy reference
     */
    grantedBy: (parent) => {
      if (!parent.grantedBy) return null;
      const grantedById = (parent.grantedBy as any)?.id ?? parent.grantedBy;
      return { __typename: "User", id: grantedById } as any;
    },
  },
};
