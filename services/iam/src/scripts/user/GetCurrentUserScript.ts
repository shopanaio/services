import { BaseScript } from "../../kernel/BaseScript.js";
import { Cached } from "../../kernel/decorators/index.js";
import type {
  GetCurrentUserParams,
  GetCurrentUserResult,
} from "./dto/GetCurrentUserDto.js";

export class GetCurrentUserScript extends BaseScript<
  GetCurrentUserParams,
  GetCurrentUserResult
> {
  @Cached({
    prefix: "current-user",
    ttl: 60 * 1000, // 1 minute
    keyFrom: (params: GetCurrentUserParams) => params.accessToken,
  })
  protected async execute(
    params: GetCurrentUserParams
  ): Promise<GetCurrentUserResult> {
    const { accessToken } = params;

    const result = await this.repository.user.getCurrentUser(accessToken);

    if (!result.success) {
      return {
        user: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: result.error || "Invalid or expired token",
          },
        ],
      };
    }

    return {
      user: result.user,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): GetCurrentUserResult {
    return {
      user: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
