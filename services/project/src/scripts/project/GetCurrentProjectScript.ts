import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  GetCurrentProjectParams,
  GetCurrentProjectResult,
} from "./dto/GetCurrentProjectDto.js";

interface IamCurrentUserResult {
  user: {
    owner: string;
    name: string;
    email?: string;
  } | null;
  userErrors: Array<{ code: string; message: string }>;
}

export class GetCurrentProjectScript extends BaseScript<
  GetCurrentProjectParams,
  GetCurrentProjectResult
> {
  protected async execute(
    params: GetCurrentProjectParams
  ): Promise<GetCurrentProjectResult> {
    const { accessToken, slug } = params;

    // 1. Get current user from IAM service
    const userResult = (await this.broker.call(
      "iam.getCurrentUser",
      { accessToken }
    )) as IamCurrentUserResult;

    if (!userResult.user) {
      return {
        project: undefined,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: userResult.userErrors[0]?.message || "Invalid or expired token",
          },
        ],
      };
    }

    // 2. Find project by slug
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

    // 3. Get IAM integration for this project
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

    // 4. Check if user's organization matches project's IAM tenant
    const tenantId = iamIntegration.config.tenantId as string | undefined;
    const userOrganization = userResult.user.owner;

    if (!tenantId || userOrganization !== tenantId) {
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
