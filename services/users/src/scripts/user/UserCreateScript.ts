import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserCreateParams, UserCreateResult } from "./dto/index.js";

export class UserCreateScript extends BaseScript<UserCreateParams, UserCreateResult> {
  protected async execute(_params: UserCreateParams): Promise<UserCreateResult> {
    throw new Error("Not implemented");
  }

  protected handleError(error: unknown): UserCreateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      userId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
