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
    const { slug } = params;

    // 1. Find project by slug (includes integrations)
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

    // 2. Check IAM integration exists
    if (!project.integrations.iam) {
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

    // Access check is now done in contextMiddleware via iam.getUserRole
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
