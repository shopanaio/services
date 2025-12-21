import { z } from "zod";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { Resolvers, Project } from "../../generated/types.js";
import { ProjectUpdateScript } from "../../../../scripts/project/ProjectUpdateScript.js";
import { ProjectDeleteScript } from "../../../../scripts/project/ProjectDeleteScript.js";
import { ProjectResolver } from "../../../../resolvers/admin/ProjectType.js";
import { requireContext } from "../utils.js";
import type { ProjectCreateWorkflow } from "../../../../workflows/index.js";

const ProjectCreateInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  locales: z.array(z.string()).min(1, "At least one locale is required"),
  currencies: z.array(z.string()).min(1, "At least one currency is required"),
  defaultCurrency: z.string(),
  status: z.enum(["active", "inactive"]).optional(),
  timezone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().nullable(),
});

function zodErrorsToUserErrors(error: z.ZodError) {
  return error.errors.map((e) => ({
    message: e.message,
    code: "VALIDATION_ERROR",
    field: e.path.map(String),
  }));
}

export const projectMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    projectCreate: async (_parent, { input }, ctx, info) => {
      // Validate input with Zod
      const validation = ProjectCreateInputSchema.safeParse(input);

      if (!validation.success) {
        return {
          project: null,
          userErrors: zodErrorsToUserErrors(validation.error),
        };
      }

      if (!ctx.kernel.workflow) {
        return {
          project: null,
          userErrors: [
            {
              message: "Workflow not available",
              code: "WORKFLOW_UNAVAILABLE",
              field: null,
            },
          ],
        };
      }

      try {
        const workflow =
          ctx.kernel.workflow.get<ProjectCreateWorkflow>("projectCreate");
        const result = await workflow.run({
          name: input.name,
          slug: input.slug,
          locales: input.locales as any,
          currencies: input.currencies as any,
          defaultCurrency: input.defaultCurrency as any,
          status: input.status ?? undefined,
          timezone: input.timezone ?? undefined,
          email: input.email ?? undefined,
        });

        const projectFieldInfo = parseGraphqlInfo(info, "project");

        return {
          project: (await ProjectResolver.load(
            result.projectId,
            projectFieldInfo,
            ctx
          )) as Project,
          userErrors: [],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          project: null,
          userErrors: [{ message, code: "WORKFLOW_ERROR", field: null }],
        };
      }
    },

    projectUpdate: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(ProjectUpdateScript, {
        id: ctx.project.id,
        name: input.name ?? undefined,
        email: input.email ?? undefined,
        timezone: input.timezone ?? undefined,
        defaultWeightUnit: input.defaultWeightUnit ?? undefined,
        defaultDimensionUnit: input.defaultDimensionUnit ?? undefined,
      });

      const projectFieldInfo = parseGraphqlInfo(info, "project");

      return {
        project: result.project
          ? ((await ProjectResolver.load(
              result.project.id,
              projectFieldInfo,
              requireContext(ctx)
            )) as Project)
          : null,
        userErrors: result.userErrors,
      };
    },

    projectDelete: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ProjectDeleteScript, {
        id: input.id,
      });

      return {
        deletedProjectId: result.deletedProjectId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
