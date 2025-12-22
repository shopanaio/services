import type { UserResultBase } from "./shared.js";
import type { AuthToken } from "./UserSignUpDto.js";

export interface TokenRefreshParams {
  refreshToken: string;
}

export interface TokenRefreshResult extends UserResultBase {
  token: AuthToken | null;
}
