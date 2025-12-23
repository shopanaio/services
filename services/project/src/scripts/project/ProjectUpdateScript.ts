import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectUpdateParams, ProjectUpdateResult } from "./dto/index.js";

export class ProjectUpdateScript extends BaseScript<ProjectUpdateParams, ProjectUpdateResult> {
  protected async execute(params: ProjectUpdateParams): Promise<ProjectUpdateResult> {
    const { id, name, email, timezone, defaultWeightUnit, defaultDimensionUnit } = params;

    const project = await this.repository.project.update(id, {
      name,
      email,
      timezone,
      defaultWeightUnit,
      defaultDimensionUnit,
    });

    if (!project) {
      return {
        project: undefined,
        userErrors: [{ message: "Project not found", code: "NOT_FOUND" }],
      };
    }

    return {
      project,
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
