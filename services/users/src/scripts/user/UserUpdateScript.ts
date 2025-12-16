import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserUpdateParams, UserUpdateResult } from "./dto/index.js";

export class UserUpdateScript extends BaseScript<UserUpdateParams, UserUpdateResult> {
  protected async execute(params: UserUpdateParams): Promise<UserUpdateResult> {
    const { id, email } = params;

    // 1. Check if user exists
    const existingUser = await this.repository.user.findById(id);
    if (!existingUser) {
      return {
        user: undefined,
        userErrors: [{ message: "User not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Check if email is already taken by another user
    if (email !== undefined && email !== existingUser.email) {
      const userWithEmail = await this.repository.user.findByEmail(email);
      if (userWithEmail) {
        return {
          user: undefined,
          userErrors: [{ message: "Email already exists", field: ["email"], code: "EMAIL_TAKEN" }],
        };
      }
    }

    // 3. Update user
    if (email !== undefined) {
      await this.repository.user.update(id, { email });
    } else {
      await this.repository.user.touch(id);
    }

    // 4. Fetch updated user
    const user = await this.repository.user.findById(id);

    this.logger.info({ userId: id }, "User updated");

    return { user: user ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): UserUpdateResult {
    return {
      user: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
