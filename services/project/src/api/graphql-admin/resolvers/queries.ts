import { parseGraphqlInfo } from "@shopana/type-resolver";
import { ProjectResolver } from "../../../resolvers/admin/ProjectType.js";
import type { QueryResolvers, Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";

export const queryResolvers = {
  Query: {
    projectQuery: () => ({} as any),
  },

  ProjectQuery: {
    projects: async (_parent, _args, ctx, info) => {
      const projects = await ctx.kernel
        .getServices()
        .repository.project.getMany();
      const projectIds = projects.map((p) => p.id);

      return ProjectResolver.loadMany(
        projectIds,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    project: async (_parent, _args, ctx, info) => {
      // Project is already loaded and validated in contextMiddleware via GetCurrentProjectScript
      // The middleware ensures user has access to this project
      if (!ctx.project?.id) return null;

      return ProjectResolver.load(
        ctx.project.id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    apiKeys: async (_parent, _args, _ctx) => {
      return [];
    },
  },
} satisfies Partial<Resolvers>;
