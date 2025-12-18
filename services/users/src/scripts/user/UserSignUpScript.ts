import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  UserSignUpParams,
  UserSignUpResult,
} from "./dto/UserSignUpDto.js";

export class UserSignUpScript extends BaseScript<
  UserSignUpParams,
  UserSignUpResult
> {
  protected async execute(params: UserSignUpParams): Promise<UserSignUpResult> {
    const { email, password } = params;

    // Check if user already exists
    const existingUser = await this.repository.user.findByEmail(email);
    if (existingUser) {
      return {
        user: null,
        token: null,
        userErrors: [
          {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user with this email already exists",
            field: ["email"],
          },
        ],
      };
    }

    // Create user
    const result = await this.repository.user.signUp({
      email,
      password,
    });

    if (!result.success) {
      return {
        user: null,
        token: null,
        userErrors: [
          {
            code: "SIGNUP_FAILED",
            message: result.error || "Failed to create user",
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

  protected handleError(_error: unknown): UserSignUpResult {
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
