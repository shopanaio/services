import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectDeleteParams, ProjectDeleteResult } from "./dto/index.js";

export class ProjectDeleteScript extends BaseScript<ProjectDeleteParams, ProjectDeleteResult> {
  protected async execute(params: ProjectDeleteParams): Promise<ProjectDeleteResult> {
    // Check if project exists
    const existingProject = await this.repository.project.findById(params.id);
    if (!existingProject) {
      return {
        deletedProjectId: undefined,
        userErrors: [{ message: "Project not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // Soft delete project (cascades to locales, currencies, api keys)
    const deleted = await this.repository.project.softDelete(params.id);

    if (!deleted) {
      return {
        deletedProjectId: undefined,
        userErrors: [{ message: "Failed to delete project", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ projectId: params.id }, "Project deleted");

    return {
      deletedProjectId: params.id,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProjectDeleteResult {
    return {
      deletedProjectId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
