import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserDeleteParams, UserDeleteResult } from "./dto/index.js";

export class UserDeleteScript extends BaseScript<UserDeleteParams, UserDeleteResult> {
  protected async execute(params: UserDeleteParams): Promise<UserDeleteResult> {
    const { id, permanent = false } = params;

    // 1. Check if user exists
    const existingUser = await this.repository.user.findById(id);
    if (!existingUser) {
      return {
        deletedUserId: undefined,
        userErrors: [{ message: "User not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete user (soft or hard)
    let deleted: boolean;
    if (permanent) {
      deleted = await this.repository.user.hardDelete(id);
    } else {
      deleted = await this.repository.user.softDelete(id);
    }

    if (!deleted) {
      return {
        deletedUserId: undefined,
        userErrors: [{ message: "Failed to delete user", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ userId: id, permanent }, "User deleted");

    return { deletedUserId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): UserDeleteResult {
    return {
      deletedUserId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
