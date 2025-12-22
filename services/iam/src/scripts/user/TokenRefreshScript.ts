import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  TokenRefreshParams,
  TokenRefreshResult,
} from "./dto/TokenRefreshDto.js";

export class TokenRefreshScript extends BaseScript<
  TokenRefreshParams,
  TokenRefreshResult
> {
  protected async execute(params: TokenRefreshParams): Promise<TokenRefreshResult> {
    const { refreshToken } = params;

    const result = await this.repository.user.refreshToken(refreshToken);

    if (!result.success) {
      return {
        token: null,
        userErrors: [
          {
            code: "INVALID_REFRESH_TOKEN",
            message: result.error || "Invalid or expired refresh token",
          },
        ],
      };
    }

    return {
      token: result.token,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): TokenRefreshResult {
    return {
      token: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
