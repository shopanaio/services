import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserSignUpParams, UserSignUpResult } from "./dto/index.js";

export class UserSignUpScript extends BaseScript<
  UserSignUpParams,
  UserSignUpResult
> {
  protected async execute(params: UserSignUpParams): Promise<UserSignUpResult> {
    if (!this.casdoorAdapter) {
      return {
        user: null,
        token: null,
        userErrors: [
          { message: "Identity provider not configured", code: "NOT_CONFIGURED" },
        ],
      };
    }

    const result = await this.casdoorAdapter.signUp({
      email: params.email,
      password: params.password,
    });

    if (!result.success) {
      return {
        user: null,
        token: null,
        userErrors: [
          { message: result.error || "Sign up failed", code: "SIGN_UP_FAILED" },
        ],
      };
    }

    return {
      user: result.user,
      token: result.token,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): UserSignUpResult {
    return {
      user: null,
      token: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
