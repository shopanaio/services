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
    organization: (parent: { organizationId?: string | null }) => {
      if (!parent.organizationId) {
        return null;
      }
      // Return federation reference - gateway will resolve from IAM service
      return { __typename: "Organization", id: parent.organizationId };
    },
    // Members field resolver - gets project members from IAM
    members: async (
      parent: { id: string; organizationId?: string | null },
      _args: unknown,
      ctx: ServiceContext
    ) => {
      if (!parent.organizationId) {
        return [];
      }

      const result = await ctx.kernel.getServices().broker.call(
        "iam.getMembersForDomain",
        {
          organizationId: parent.organizationId,
          domain: [["project", parent.id]],
        }
      );

      if (!result || result.userErrors?.length > 0) {
        return [];
      }

      return result.members.map((m: { userId: string; role: string; grantedAt?: Date; grantedBy?: string }) => ({
        user: { __typename: "User", id: m.userId },
        role: m.role,
        grantedAt: m.grantedAt ?? null,
        grantedBy: m.grantedBy ? { __typename: "User", id: m.grantedBy } : null,
      }));
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
