import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectCreateParams, ProjectCreateResult } from "./dto/index.js";

export class ProjectCreateScript extends BaseScript<
  ProjectCreateParams,
  ProjectCreateResult
> {
  protected async execute(
    params: ProjectCreateParams
  ): Promise<ProjectCreateResult> {
    const projectId = crypto.randomUUID();

    const project = await this.repository.project.create({
      id: projectId,
      name: params.name,
      slug: params.slug,
      locales: params.locales,
      defaultCurrency: params.defaultCurrency,
      status: params.status,
      timezone: params.timezone,
      email: params.email,
    });

    return {
      project,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProjectCreateResult {
    return {
      project: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
