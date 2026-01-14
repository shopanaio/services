import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  UserSignInParams,
  UserSignInResult,
} from "./dto/UserSignInDto.js";

export class UserSignInScript extends BaseScript<
  UserSignInParams,
  UserSignInResult
> {
  protected async execute(params: UserSignInParams): Promise<UserSignInResult> {
    const { email, password, headers } = params;

    const result = await this.repository.user.signIn({
      email,
      password,
      headers,
    });

    if (!result.success) {
      return {
        user: null,
        token: null,
        userErrors: [
          {
            code: "INVALID_CREDENTIALS",
            message: result.error || "Invalid email or password",
          },
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
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
