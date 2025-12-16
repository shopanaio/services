import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserUpdateParams, UserUpdateResult } from "./dto/index.js";

export class UserUpdateScript extends BaseScript<UserUpdateParams, UserUpdateResult> {
  protected async execute(params: UserUpdateParams): Promise<UserUpdateResult> {
    const { id, email, firstName, lastName, phone, locale, isAdmin, isForbidden, roles } = params;

    // 1. Check if user exists
    const existingUser = await this.repository.user.findById(id);
    if (!existingUser) {
      return {
        userId: undefined,
        userErrors: [{
          message: "User not found",
          field: ["id"],
          code: "NOT_FOUND",
        }],
      };
    }

    // 2. If email is being changed, check if new email is available
    if (email && email !== existingUser.email) {
      const userWithEmail = await this.repository.user.findByEmail(email);
      if (userWithEmail) {
        return {
          userId: undefined,
          userErrors: [{
            message: `Email "${email}" is already in use`,
            field: ["email"],
            code: "EMAIL_ALREADY_EXISTS",
          }],
        };
      }
    }

    // 3. Update user
    const updatedUser = await this.repository.user.update(id, {
      email,
      firstName,
      lastName,
      phone,
      locale,
      isAdmin,
      isForbidden,
      roles,
    });

    this.logger.info({ userId: updatedUser.id }, "User updated");

    return {
      userId: updatedUser.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): UserUpdateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      userId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
