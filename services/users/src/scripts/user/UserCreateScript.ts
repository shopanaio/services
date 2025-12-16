import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserCreateParams, UserCreateResult } from "./dto/index.js";

export class UserCreateScript extends BaseScript<UserCreateParams, UserCreateResult> {
  protected async execute(params: UserCreateParams): Promise<UserCreateResult> {
    const { email, password, firstName, lastName, phone, locale, isAdmin, roles } = params;

    // 1. Check if user with this email already exists
    const existingUser = await this.repository.user.findByEmail(email);
    if (existingUser) {
      return {
        userId: undefined,
        userErrors: [{
          message: `User with email "${email}" already exists`,
          field: ["email"],
          code: "EMAIL_ALREADY_EXISTS",
        }],
      };
    }

    // 2. Create user
    const user = await this.repository.user.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      locale,
      isAdmin,
      roles,
    });

    this.logger.info({ userId: user.id, email }, "User created");

    return {
      userId: user.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): UserCreateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      userId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
