import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectUpdateParams, ProjectUpdateResult } from "./dto/index.js";

export class ProjectUpdateScript extends BaseScript<ProjectUpdateParams, ProjectUpdateResult> {
  protected async execute(params: ProjectUpdateParams): Promise<ProjectUpdateResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): ProjectUpdateResult {
    return {
      project: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
