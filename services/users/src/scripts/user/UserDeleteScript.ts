import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserDeleteParams, UserDeleteResult } from "./dto/index.js";

export class UserDeleteScript extends BaseScript<UserDeleteParams, UserDeleteResult> {
  protected async execute(params: UserDeleteParams): Promise<UserDeleteResult> {
    const { id, permanent } = params;

    // 1. Check if user exists
    const existingUser = await this.repository.user.findById(id);
    if (!existingUser) {
      return {
        deletedUserId: undefined,
        userErrors: [{
          message: "User not found",
          field: ["id"],
          code: "NOT_FOUND",
        }],
      };
    }

    // 2. Delete user
    await this.repository.user.delete(id, permanent);

    this.logger.info({ userId: id, permanent }, "User deleted");

    return {
      deletedUserId: id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): UserDeleteResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      deletedUserId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
