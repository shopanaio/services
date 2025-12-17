import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectUpdateParams, ProjectUpdateResult } from "./dto/index.js";

export class ProjectUpdateScript extends BaseScript<ProjectUpdateParams, ProjectUpdateResult> {
  protected async execute(params: ProjectUpdateParams): Promise<ProjectUpdateResult> {
    // Check if project exists
    const existingProject = await this.repository.project.findById(params.id);
    if (!existingProject) {
      return {
        project: undefined,
        userErrors: [{ message: "Project not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // Update project
    const project = await this.repository.project.update(params.id, {
      name: params.name,
      email: params.email,
      timezone: params.timezone,
      defaultWeightUnit: params.defaultWeightUnit,
      defaultDimensionUnit: params.defaultDimensionUnit,
    });

    this.logger.info({ projectId: params.id }, "Project updated");

    return {
      project: project ?? undefined,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProjectUpdateResult {
    return {
      project: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
