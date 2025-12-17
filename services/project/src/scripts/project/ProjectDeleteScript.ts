import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectDeleteParams, ProjectDeleteResult } from "./dto/index.js";

export class ProjectDeleteScript extends BaseScript<ProjectDeleteParams, ProjectDeleteResult> {
  protected async execute(params: ProjectDeleteParams): Promise<ProjectDeleteResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): ProjectDeleteResult {
    return {
      deletedProjectId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
