import type { Resolvers, Organization, Member, ProjectAccess } from "../generated/types.js";
import { OrgRole, ProjectRole } from "../generated/types.js";
import type { ScopePart } from "../../../casbin/CasbinService.js";

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

/**
 * Map org role string to enum
 */
function mapOrgRole(role: string): OrgRole {
  switch (role.toLowerCase()) {
    case "owner":
      return OrgRole.Owner;
    case "admin":
      return OrgRole.Admin;
    default:
      return OrgRole.Member;
  }
}

/**
 * Map project role string to enum
 */
function mapProjectRole(role: string): ProjectRole {
  switch (role.toLowerCase()) {
    case "admin":
      return ProjectRole.Admin;
    case "editor":
      return ProjectRole.Editor;
    default:
      return ProjectRole.Viewer;
  }
}

export const organizationResolvers: Partial<Resolvers> = {
  Query: {
    /**
     * Get current user's organizations
     */
    myOrganizations: async (_parent, _args, ctx) => {
      const userId = ctx.currentUser?.id;
      if (!userId) {
        return [];
      }

      const organizations = await ctx.kernel.repository.organization.getOrganizationsForUser(userId);
      return organizations.map(mapOrganization);
    },

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

      // Add current user as owner
      await ctx.kernel.repository.organization.addMember({
        organizationId: org.id,
        userId,
        orgRole: "owner",
      });

      // Initialize default roles for the organization
      const casbin = ctx.kernel.repository.casbin;

      // Add default policies for system roles (all domains)
      await casbin.addPolicy(org.id, "admin", [], [["*"]], "*", "allow");
      await casbin.addPolicy(org.id, "editor", [], [["product", "*"]], "write", "allow");
      await casbin.addPolicy(org.id, "editor", [], [["product", "*"]], "read", "allow");
      await casbin.addPolicy(org.id, "viewer", [], [["*"]], "read", "allow");

      // Assign owner role to creator (all domains)
      await casbin.assignRole(org.id, userId, "admin", []);

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
     * Switch organization context - returns new JWT tokens
     */
    switchOrganization: async (_parent, { organizationId }, ctx) => {
      const userId = ctx.currentUser?.id;
      if (!userId) {
        return {
          auth: null,
          organization: null,
          userErrors: [{ message: "User not authenticated", code: "UNAUTHENTICATED" }],
        };
      }

      const hasAccess = await ctx.kernel.repository.organization.userHasAccessToOrg(userId, organizationId);
      if (!hasAccess) {
        return {
          auth: null,
          organization: null,
          userErrors: [{ message: "No access to this organization", code: "FORBIDDEN" }],
        };
      }

      const org = await ctx.kernel.repository.organization.findById(organizationId);
      if (!org) {
        return {
          auth: null,
          organization: null,
          userErrors: [{ message: "Organization not found", code: "NOT_FOUND" }],
        };
      }

      // Generate new tokens with organizationId claim
      // Note: This requires integration with Better Auth JWT plugin
      // For now, return placeholder - actual implementation depends on auth setup
      return {
        auth: {
          accessToken: `org-scoped-token-${organizationId}`, // Placeholder
          refreshToken: `refresh-token-${organizationId}`, // Placeholder
          expiresIn: 900, // 15 minutes
        },
        organization: mapOrganization(org),
        userErrors: [],
      };
    },

    /**
     * Invite member to organization
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

      // Add member
      const member = await ctx.kernel.repository.organization.addMember({
        organizationId,
        userId: invitedUser.id,
        orgRole: input.orgRole.toLowerCase(),
        invitedBy: userId,
      });

      return {
        member: {
          id: member.id,
          user: { __typename: "User", id: invitedUser.id } as any,
          orgRole: mapOrgRole(member.orgRole),
          projectAccess: [],
          createdAt: member.createdAt.toISOString(),
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

      // Also remove all casbin role assignments for this user
      const casbin = ctx.kernel.repository.casbin;
      const roles = await casbin.getRolesForUser(organizationId, member.userId);
      for (const { role, domain } of roles) {
        await casbin.removeRole(organizationId, member.userId, role, domain === "*" ? [] : [[domain]]);
      }

      return {
        removedMemberId: memberId,
        userErrors: [],
      };
    },

    /**
     * Assign project role to member
     */
    assignProjectRole: async (_parent, { input }, ctx) => {
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

      const member = await ctx.kernel.repository.organization.findMemberById(input.memberId);
      if (!member || member.organizationId !== organizationId) {
        return {
          member: null,
          userErrors: [{ message: "Member not found", code: "NOT_FOUND" }],
        };
      }

      // Determine domain
      const domain: ScopePart[] = input.projectId === "all" ? [] : [["project", input.projectId]];
      const roleStr = input.role.toLowerCase();

      // Assign role in casbin
      const casbin = ctx.kernel.repository.casbin;
      await casbin.assignRole(organizationId, member.userId, roleStr, domain);

      // Get updated roles for response
      const roles = await casbin.getRolesForUser(organizationId, member.userId);
      const projectAccess: ProjectAccess[] = roles.map(({ role, domain }) => ({
        project: domain === "*" ? null : { __typename: "Project", id: domain.split(":")[1] } as any,
        role: mapProjectRole(role),
        allProjects: domain === "*",
      }));

      return {
        member: {
          id: member.id,
          user: { __typename: "User", id: member.userId } as any,
          orgRole: mapOrgRole(member.orgRole),
          projectAccess,
          createdAt: member.createdAt.toISOString(),
        },
        userErrors: [],
      };
    },

    /**
     * Remove project access from member
     */
    removeProjectAccess: async (_parent, { input }, ctx) => {
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

      const member = await ctx.kernel.repository.organization.findMemberById(input.memberId);
      if (!member || member.organizationId !== organizationId) {
        return {
          member: null,
          userErrors: [{ message: "Member not found", code: "NOT_FOUND" }],
        };
      }

      // Get current roles for user in this project
      const domain: ScopePart[] = [["project", input.projectId]];
      const casbin = ctx.kernel.repository.casbin;
      const rolesInDomain = await casbin.getRolesForUserInDomain(organizationId, member.userId, domain);

      // Remove all roles in this domain
      for (const role of rolesInDomain) {
        await casbin.removeRole(organizationId, member.userId, role, domain);
      }

      // Get updated roles for response
      const roles = await casbin.getRolesForUser(organizationId, member.userId);
      const projectAccess: ProjectAccess[] = roles.map(({ role, domain }) => ({
        project: domain === "*" ? null : { __typename: "Project", id: domain.split(":")[1] } as any,
        role: mapProjectRole(role),
        allProjects: domain === "*",
      }));

      return {
        member: {
          id: member.id,
          user: { __typename: "User", id: member.userId } as any,
          orgRole: mapOrgRole(member.orgRole),
          projectAccess,
          createdAt: member.createdAt.toISOString(),
        },
        userErrors: [],
      };
    },
  },

  Organization: {
    /**
     * Get all members of organization
     */
    members: async (parent, _args, ctx) => {
      const orgMembers = await ctx.kernel.repository.organization.getMembersForOrg(parent.id);
      const casbin = ctx.kernel.repository.casbin;

      const members: Member[] = [];

      for (const m of orgMembers) {
        const roles = await casbin.getRolesForUser(parent.id, m.userId);
        const projectAccess: ProjectAccess[] = roles.map(({ role, domain }) => ({
          project: domain === "*" ? null : { __typename: "Project", id: domain.split(":")[1] } as any,
          role: mapProjectRole(role),
          allProjects: domain === "*",
        }));

        members.push({
          id: m.id,
          user: { __typename: "User", id: m.userId } as any,
          orgRole: mapOrgRole(m.orgRole),
          projectAccess,
          createdAt: m.createdAt.toISOString(),
        });
      }

      return members;
    },

    /**
     * Get all roles defined in organization
     */
    roles: async (parent, _args, ctx) => {
      const result = await ctx.kernel.repository.authorization.listRoles(parent.id);
      return result;
    },

    /**
     * Get available resources for role editor
     */
    availableResources: async (_parent, _args, ctx) => {
      return ctx.kernel.repository.resource.getAllResources();
    },

    /**
     * Get projects in organization (federation reference)
     */
    projects: async (parent, _args, _ctx) => {
      // This will be resolved by the Project service via federation
      // Return a reference that the gateway can resolve
      return [{ __typename: "Project", id: parent.id }] as any;
    },
  },

  Member: {
    /**
     * Resolve user reference
     */
    user: (parent) => {
      return { __typename: "User", id: parent.user.id } as any;
    },
  },
};
