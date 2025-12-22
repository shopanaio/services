import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProjectPayload } from "./dto/shared.js";

export interface GetProjectByIdParams {
  id: string;
}

export type GetProjectByIdResult = ProjectPayload;

export class GetProjectByIdScript extends BaseScript<
  GetProjectByIdParams,
  GetProjectByIdResult
> {
  protected async execute(
    params: GetProjectByIdParams
  ): Promise<GetProjectByIdResult> {
    const { id } = params;

    const project = await this.repository.project.findById(id);

    if (!project) {
      return {
        project: undefined,
        userErrors: [
          {
            code: "PROJECT_NOT_FOUND",
            message: `Project with id "${id}" not found`,
          },
        ],
      };
    }

    return {
      project,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): GetProjectByIdResult {
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
