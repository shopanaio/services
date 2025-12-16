import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserCreateParams, UserCreateResult } from "./dto/index.js";

export class UserCreateScript extends BaseScript<UserCreateParams, UserCreateResult> {
  protected async execute(params: UserCreateParams): Promise<UserCreateResult> {
    const { email } = params;

    // Check if email is already taken
    const existingUser = await this.repository.user.findByEmail(email);
    if (existingUser) {
      return {
        user: undefined,
        userErrors: [{ message: "Email already exists", field: ["email"], code: "EMAIL_TAKEN" }],
      };
    }

    // Create user
    const user = await this.repository.user.create({ email });

    this.logger.info({ userId: user.id }, "User created");

    return {
      user,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): UserCreateResult {
    return {
      user: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
