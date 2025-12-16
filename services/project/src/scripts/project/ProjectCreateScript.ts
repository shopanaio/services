import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectCreateParams, ProjectCreateResult } from "./dto/index.js";

export class ProjectCreateScript extends BaseScript<ProjectCreateParams, ProjectCreateResult> {
  protected async execute(params: ProjectCreateParams): Promise<ProjectCreateResult> {
    // Check if slug is unique
    const existingProject = await this.repository.project.findBySlug(params.slug);
    if (existingProject) {
      return {
        project: undefined,
        userErrors: [{ message: "Project with this slug already exists", field: ["slug"], code: "SLUG_TAKEN" }],
      };
    }

    // Create project
    const project = await this.repository.project.create({
      name: params.name,
      slug: params.slug,
      status: params.status,
      timezone: params.timezone,
      country: params.country,
      phoneNumber: params.phoneNumber,
      email: params.email,
      defaultLocale: params.locales[0],
      defaultCurrency: params.currency,
    });

    // Create locales
    if (params.locales.length > 0) {
      await this.repository.locale.createMany(
        project.id,
        params.locales.map((code, index) => ({
          code,
          isActive: true,
        }))
      );
    }

    // Create currency
    await this.repository.currency.create(project.id, {
      code: params.currency,
      isActive: true,
    });

    this.logger.info({ projectId: project.id }, "Project created");

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
