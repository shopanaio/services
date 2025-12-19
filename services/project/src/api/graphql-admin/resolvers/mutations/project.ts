import type { Resolvers } from "../../generated/types.js";
import { ProjectUpdateScript } from "../../../../scripts/project/ProjectUpdateScript.js";
import { ProjectDeleteScript } from "../../../../scripts/project/ProjectDeleteScript.js";
import type { ProjectCreateWorkflow } from "../../../../workflows/index.js";

export const projectMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    projectCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel.workflow) {
        return {
          project: null,
          userErrors: [{ message: "Workflow not available", code: "WORKFLOW_UNAVAILABLE", field: null }],
        };
      }

      try {
        const workflow = ctx.kernel.workflow.get<ProjectCreateWorkflow>('projectCreate');
        const result = await workflow.run({
          name: input.name,
          slug: input.slug,
          locales: input.locales as any,
          defaultCurrency: input.defaultCurrency as any,
          status: input.status ?? undefined,
          timezone: input.timezone ?? undefined,
          email: input.email ?? undefined,
        });

        // Fetch created project to return
        const project = await ctx.kernel.repository?.project.findById(result.projectId);

        return {
          project: project ?? null,
          userErrors: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          project: null,
          userErrors: [{ message, code: "WORKFLOW_ERROR", field: null }],
        };
      }
    },

    projectUpdate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ProjectUpdateScript, {
        id: ctx.project.id,
        name: input.name ?? undefined,
        email: input.email ?? undefined,
        timezone: input.timezone ?? undefined,
        defaultWeightUnit: input.defaultWeightUnit ?? undefined,
        defaultDimensionUnit: input.defaultDimensionUnit ?? undefined,
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
