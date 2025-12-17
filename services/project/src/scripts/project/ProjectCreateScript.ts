import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectCreateParams, ProjectCreateResult } from "./dto/index.js";

export class ProjectCreateScript extends BaseScript<ProjectCreateParams, ProjectCreateResult> {
  protected async execute(params: ProjectCreateParams): Promise<ProjectCreateResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): ProjectCreateResult {
    return {
      project: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
