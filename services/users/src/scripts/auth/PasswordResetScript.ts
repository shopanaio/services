import { BaseScript } from "../../kernel/BaseScript.js";
import type { PasswordResetParams, PasswordResetResult } from "./dto/index.js";

export class PasswordResetScript extends BaseScript<PasswordResetParams, PasswordResetResult> {
  protected async execute(params: PasswordResetParams): Promise<PasswordResetResult> {
    const { email, code, newPassword } = params;

    try {
      await this.repository.customer.resetPassword(email, code, newPassword);
      this.logger.info({ email }, "Password reset successful");

      return {
        success: true,
        userErrors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      return {
        success: false,
        userErrors: [{
          message,
          code: "RESET_FAILED",
        }],
      };
    }
  }

  protected handleError(error: unknown): PasswordResetResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      success: false,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
