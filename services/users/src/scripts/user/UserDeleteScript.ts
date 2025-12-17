import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserDeleteParams, UserDeleteResult } from "./dto/index.js";

export class UserDeleteScript extends BaseScript<UserDeleteParams, UserDeleteResult> {
  protected async execute(_params: UserDeleteParams): Promise<UserDeleteResult> {
    throw new Error("Not implemented");
  }

  protected handleError(error: unknown): UserDeleteResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      deletedUserId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
