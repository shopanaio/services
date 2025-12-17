import type { Resolvers } from "../generated/types.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    projectQuery: () => ({}),
  },

  ProjectQuery: {
    projects: async (_parent, _args, ctx) => {
      return ctx.kernel.getServices().repository.project.getMany();
    },

    project: async (_parent, { slug }, ctx) => {
      return ctx.kernel.getServices().repository.project.findBySlug(slug);
    },

    apiKeys: async (_parent, _args, ctx) => {
      return ctx.loaders.apiKeys.load(ctx.project.id);
    },
  },
};
