import { BaseScript } from "../../kernel/BaseScript.js";
import type { TokenRefreshParams, TokenRefreshResult, AuthTokenData } from "./dto/index.js";

const DEFAULT_EXPIRES_IN = 7200; // 2 hours

export class TokenRefreshScript extends BaseScript<TokenRefreshParams, TokenRefreshResult> {
  protected async execute(params: TokenRefreshParams): Promise<TokenRefreshResult> {
    const { refreshToken } = params;

    try {
      // Use Casdoor SDK to refresh token
      const newToken = await this.repository.casdoor.client.sdkClient.refreshOAuthToken(refreshToken);

      const token: AuthTokenData = {
        accessToken: newToken.accessToken,
        expiresIn: DEFAULT_EXPIRES_IN,
        refreshToken: newToken.refreshToken || null,
      };

      this.logger.info("Token refreshed");

      return {
        token,
        userErrors: [],
      };
    } catch {
      return {
        token: undefined,
        userErrors: [{
          message: "Invalid or expired refresh token",
          code: "INVALID_REFRESH_TOKEN",
        }],
      };
    }
  }

  protected handleError(error: unknown): TokenRefreshResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      token: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
