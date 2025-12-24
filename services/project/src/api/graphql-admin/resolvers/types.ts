import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { ProjectResolver } from "../../../resolvers/admin/ProjectType.js";
import type { Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";
import { CURRENCY_INFO, LOCALE_INFO } from "@shopana/shared-references";

/**
 * Resolves project using ProjectResolver
 */
export async function resolveProject(
  projectId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo
) {
  return ProjectResolver.load(
    projectId,
    parseGraphqlInfo(info),
    requireContext(ctx)
  );
}

export const typeResolvers: Partial<Resolvers> = {
  // Currency type resolver
  Currency: {
    name: (parent) => {
      const code = parent.code as string as keyof typeof CURRENCY_INFO;
      return CURRENCY_INFO[code]?.name ?? parent.code;
    },
  },

  // Locale type resolver
  Locale: {
    name: (parent) => {
      const code = parent.code as string as keyof typeof LOCALE_INFO;
      return LOCALE_INFO[code]?.name ?? parent.code;
    },
  },

  // Project type resolver - uses ProjectResolver for __resolveReference
  Project: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> => {
      return resolveProject(reference.id, ctx, info);
    },
    // Organization field resolver - returns federation reference
    organization: async (
      parent: { id: string },
      _args: unknown,
      ctx: ServiceContext
    ) => {
      // Load project to get organizationId
      const project = await ctx.kernel
        .getServices()
        .repository.project.findById(parent.id);
      const organizationId = project?.organizationId ?? null;

      if (!organizationId) {
        return null;
      }
      // Return federation reference - gateway will resolve from IAM service
      return { __typename: "Organization", id: organizationId };
    },
    // Members field resolver - gets project members from IAM
    members: async (
      parent: { id: string },
      _args: unknown,
      ctx: ServiceContext
    ) => {
      // Load project to get organizationId
      const project = await ctx.kernel
        .getServices()
        .repository.project.findById(parent.id);
      const organizationId = project?.organizationId ?? null;

      console.log("Resolving members for project:", JSON.stringify(parent));

      if (!organizationId) {
        return [];
      }

      const result = await ctx.kernel
        .getServices()
        .broker.call("iam.getMembersForDomain", {
          organizationId,
          domain: [["project", parent.id]],
        });

      if (!result || result.userErrors?.length > 0) {
        return [];
      }

      return result.members.map(
        (m: {
          userId: string;
          role: string;
          roleDisplayName?: string | null;
          roleIsSystem?: boolean;
          grantedAt?: Date;
          grantedBy?: string;
        }) => ({
          id: m.userId, // ProjectMember id is the userId
          user: { __typename: "User", id: m.userId },
          role: {
            __typename: "Role",
            name: m.role,
            displayName: m.roleDisplayName ?? m.role,
            isSystem: m.roleIsSystem ?? false,
          },
          grantedAt: m.grantedAt ?? null,
          grantedBy: m.grantedBy
            ? { __typename: "User", id: m.grantedBy }
            : null,
        })
      );
    },
  },

  // ProjectMember type resolver
  ProjectMember: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: (parent: any) => {
      // Return federation reference
      const userId = parent.user?.id ?? parent.id;
      return { __typename: "User", id: userId };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    role: (parent: any) => {
      // Return federation reference to Role
      const roleName =
        typeof parent.role === "string" ? parent.role : parent.role?.name;
      return { __typename: "Role", name: roleName };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grantedBy: (parent: any) => {
      if (!parent.grantedBy) return null;
      const grantedById =
        typeof parent.grantedBy === "string"
          ? parent.grantedBy
          : parent.grantedBy.id;
      return { __typename: "User", id: grantedById };
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
