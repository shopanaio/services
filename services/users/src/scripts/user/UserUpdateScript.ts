import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserUpdateParams, UserUpdateResult } from "./dto/index.js";

export class UserUpdateScript extends BaseScript<UserUpdateParams, UserUpdateResult> {
  protected async execute(_params: UserUpdateParams): Promise<UserUpdateResult> {
    throw new Error("Not implemented");
  }

  protected handleError(error: unknown): UserUpdateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      userId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
