import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  GetCurrentProjectParams,
  GetCurrentProjectResult,
} from "./dto/GetCurrentProjectDto.js";

export class GetCurrentProjectScript extends BaseScript<
  GetCurrentProjectParams,
  GetCurrentProjectResult
> {
  protected async execute(
    params: GetCurrentProjectParams
  ): Promise<GetCurrentProjectResult> {
    const { userOwner, slug } = params;

    // 1. Find project by slug
    const project = await this.repository.project.findBySlug(slug);

    if (!project) {
      return {
        project: undefined,
        userErrors: [
          {
            code: "PROJECT_NOT_FOUND",
            message: `Project with slug "${slug}" not found`,
          },
        ],
      };
    }

    // 2. Get IAM integration for this project
    const iamIntegration = await this.repository.integration.findByType(
      project.id,
      "iam"
    );

    if (!iamIntegration) {
      return {
        project: undefined,
        userErrors: [
          {
            code: "PROJECT_NOT_CONFIGURED",
            message: "Project IAM integration not configured",
          },
        ],
      };
    }

    // 3. Check if user's organization matches project's IAM tenant
    const tenantId = iamIntegration.config.tenantId as string | undefined;

    if (!tenantId || userOwner !== tenantId) {
      return {
        project: undefined,
        userErrors: [
          {
            code: "ACCESS_DENIED",
            message: "You do not have access to this project",
          },
        ],
      };
    }

    return {
      project,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): GetCurrentProjectResult {
    return {
      project: undefined,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
