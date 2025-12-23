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
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
