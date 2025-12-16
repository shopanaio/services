import type { Resolvers } from "../../generated/types.js";
import { ProjectCreateScript } from "../../../../scripts/project/ProjectCreateScript.js";
import { ProjectUpdateScript } from "../../../../scripts/project/ProjectUpdateScript.js";
import { ProjectDeleteScript } from "../../../../scripts/project/ProjectDeleteScript.js";

export const projectMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    projectCreate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ProjectCreateScript, {
        name: input.name,
        slug: input.slug,
        locales: input.locales,
        currency: input.currency,
        country: input.country,
        status: input.status ?? undefined,
        timezone: input.timezone ?? undefined,
        phoneNumber: input.phoneNumber ?? undefined,
        email: input.email ?? undefined,
      });

      return {
        project: result.project ?? null,
        userErrors: result.userErrors,
      };
    },

    projectUpdate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ProjectUpdateScript, {
        id: ctx.project.id,
        name: input.name ?? undefined,
        phoneNumber: input.phoneNumber ?? undefined,
        email: input.email ?? undefined,
        country: input.country ?? undefined,
        timezone: input.timezone ?? undefined,
        weightUnit: input.weightUnit ?? undefined,
        unitSystem: input.unitSystem ?? undefined,
      });

      return {
        project: result.project ?? null,
        userErrors: result.userErrors,
      };
    },

    projectDelete: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ProjectDeleteScript, { id: input.id });

      return {
        deletedProjectId: result.deletedProjectId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
