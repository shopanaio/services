import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserSignInParams, UserSignInResult } from "./dto/index.js";

export class UserSignInScript extends BaseScript<
  UserSignInParams,
  UserSignInResult
> {
  protected async execute(params: UserSignInParams): Promise<UserSignInResult> {
    if (!this.casdoorAdapter) {
      return {
        user: null,
        token: null,
        userErrors: [
          { message: "Identity provider not configured", code: "NOT_CONFIGURED" },
        ],
      };
    }

    const result = await this.casdoorAdapter.signIn({
      email: params.email,
      password: params.password,
    });

    if (!result.success) {
      return {
        user: null,
        token: null,
        userErrors: [
          { message: result.error || "Sign in failed", code: "SIGN_IN_FAILED" },
        ],
      };
    }

    return {
      user: result.user,
      token: result.token,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): UserSignInResult {
    return {
      user: null,
      token: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
