import { BaseScript } from "../../kernel/BaseScript.js";
import type { SignOutParams, SignOutResult } from "./dto/index.js";

export class SignOutScript extends BaseScript<SignOutParams, SignOutResult> {
  protected async execute(_params: SignOutParams): Promise<SignOutResult> {
    // Note: Casdoor doesn't have a server-side session invalidation API for JWT tokens
    // The client should discard the token, and the token will expire naturally
    // For session-based auth, we would call casdoor to invalidate the session

    this.logger.info("Customer signed out");

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SignOutResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      success: false,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
